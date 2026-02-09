import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { logger } from '../utils/logger';
import { ConfigManager } from './config';
import { LegacyServer, HttpRequestContext, LegacyFileResponse } from './legacy-server';
import { injectPolyfills } from './utils/htmlInjector';
import { sanitizeErrorMessage, sanitizeUrlPath } from './utils/pathSecurity';
import { validateHostname } from './validation/schemas';
import { zipManager } from './zip-manager';
import { getMimeType } from './mimeTypes';
import { setCorsHeaders } from './utils/cors';

const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024;
const STREAM_TIMEOUT_MS = 120000;
const CACHE_MAX_AGE_SECONDS = 86400;

// Only these CGI headers are forwarded -- prevents header injection (Set-Cookie, Location, etc.)
const ALLOWED_CGI_HEADERS = new Set([
  'cache-control',
  'expires',
  'last-modified',
  'etag',
  'pragma',
  'content-disposition',
  'content-language',
  'x-powered-by',
]);

export class ProxyRequestHandler {
  private legacyServer: LegacyServer;

  constructor() {
    this.legacyServer = new LegacyServer();
  }

  /** Replicates the request processing flow from Go's goproxy */
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      logger.info(`[ProxyHandler] ${req.method} ${req.url}`);

      if (!req.url) {
        this.sendError(res, 400, 'Bad Request: No URL');
        return;
      }

      let targetUrl: URL;
      let hostname: string;
      let urlPath: string;

      // Legacy Flash games sometimes emit /http:/domain instead of /http://domain
      let normalizedUrl = req.url;
      if (normalizedUrl.match(/^\/https?:\/[^\/]/)) {
        normalizedUrl = normalizedUrl.replace(/^(\/https?:)\//, '$1//');
        logger.debug(`[ProxyHandler] Normalized malformed URL`);
      }

      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        targetUrl = new URL(normalizedUrl);
        hostname = targetUrl.hostname;
        urlPath = sanitizeUrlPath(targetUrl.pathname + targetUrl.search);
      } else if (normalizedUrl.startsWith('/http://') || normalizedUrl.startsWith('/https://')) {
        const urlWithoutSlash = normalizedUrl.substring(1);
        targetUrl = new URL(urlWithoutSlash);
        hostname = targetUrl.hostname;
        urlPath = sanitizeUrlPath(targetUrl.pathname + targetUrl.search);
      } else {
        hostname = req.headers.host || 'localhost';
        urlPath = sanitizeUrlPath(req.url);
        targetUrl = new URL(`http://${hostname}${urlPath}`);
      }

      hostname = hostname.split(':')[0];

      try {
        hostname = validateHostname(hostname);
      } catch (error) {
        this.sendError(res, 400, 'Bad Request: Invalid hostname');
        return;
      }

      logger.info(`[ProxyHandler] Parsed - Host: ${hostname}, Path: ${urlPath}`);

      {
        logger.debug(`[ProxyHandler] Trying GameZip server...`);
        const gameZipResult = await this.tryGameZipServer(hostname, urlPath);
        if (gameZipResult) {
          logger.info(`[ProxyHandler] ✓ Served from GameZip`);
          this.sendResponse(res, { ...gameZipResult, source: 'gamezipserver' }, 'gamezipserver');
          return;
        }
      }

      const requestContext = await this.buildRequestContext(req);
      logger.debug(`[ProxyHandler] Trying legacy server...`);
      const legacyResult = await this.legacyServer.serveLegacy(hostname, urlPath, requestContext);

      logger.info(`[ProxyHandler] ✓ Served from ${legacyResult.source}`);
      this.sendResponse(res, legacyResult, legacyResult.source);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const safeMessage = sanitizeErrorMessage(errorMessage);
      logger.error(`[ProxyHandler] Error handling request: ${safeMessage}`);

      this.sendError(res, 500, 'Internal server error');
    }
  }

  /** Returns file data from a mounted ZIP, or null to fall through to legacy server */
  private async tryGameZipServer(
    hostname: string,
    urlPath: string
  ): Promise<{ data: Buffer; contentType: string; statusCode: number } | null> {
    try {
      const pathWithoutQuery = urlPath.split('?')[0];
      const relPath = path.posix.join(hostname, pathWithoutQuery);

      logger.debug(`[ProxyHandler] Searching mounted ZIPs for: ${relPath}`);

      const result = await zipManager.findFile(relPath);

      if (result) {
        const ext = path.extname(pathWithoutQuery).substring(1).toLowerCase();
        const contentType = getMimeType(ext);

        // sendResponse() handles polyfill injection for all HTML responses
        return { data: result.data, contentType, statusCode: 200 };
      }

      return null;
    } catch (error) {
      logger.debug(`[ProxyHandler] GameZip lookup failed`);
      return null;
    }
  }

  private sendResponse(res: ServerResponse, result: LegacyFileResponse, source: string): void {
    const settings = ConfigManager.getSettings();
    const contentType = result.contentType;
    const statusCode = result.statusCode || 200;

    setCorsHeaders(res, settings);

    res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-Source', source);
    }
    res.setHeader('Connection', 'keep-alive');

    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        const lowerKey = key.toLowerCase();
        if (!ALLOWED_CGI_HEADERS.has(lowerKey)) {
          continue;
        }
        if (/[\r\n]/.test(value)) {
          logger.warn(`[Security] CGI header value contains CRLF, skipping: ${key}`);
          continue;
        }
        res.setHeader(key, value);
      }
    }

    if (result.stream) {
      res.setHeader('Content-Type', contentType);
      if (result.size !== undefined) {
        res.setHeader('Content-Length', result.size);
      }
      res.writeHead(statusCode);

      // Prevents hung connections from consuming resources indefinitely
      const streamTimeout = setTimeout(() => {
        logger.warn('[ProxyHandler] Stream timeout - closing connection');
        result.stream?.destroy(new Error('Stream timeout'));
        if (!res.writableEnded) {
          res.end();
        }
      }, STREAM_TIMEOUT_MS);

      res.on('close', () => {
        clearTimeout(streamTimeout);
        if (result.stream && !result.stream.destroyed) {
          result.stream.destroy();
        }
      });

      result.stream.pipe(res);

      result.stream.on('error', (err) => {
        clearTimeout(streamTimeout);
        const safeMessage = sanitizeErrorMessage(err.message || 'Unknown error');
        logger.error(`[ProxyHandler] Stream error: ${safeMessage}`);
        if (!res.headersSent) {
          res.writeHead(500);
        }
        if (!res.writableEnded) {
          res.end();
        }
      });

      result.stream.on('end', () => {
        clearTimeout(streamTimeout);
      });

      result.stream.on('close', () => {
        clearTimeout(streamTimeout);
      });
    } else if (result.data) {
      let fileData = result.data;
      if (contentType.includes('text/html')) {
        fileData = injectPolyfills(result.data);
        logger.info(`[ProxyHandler] Injected polyfills into HTML file`);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileData.length);
      res.writeHead(statusCode);
      res.end(fileData);
    } else {
      logger.error('[ProxyHandler] Invalid response: neither data nor stream provided');
      this.sendError(res, 500, 'Internal server error: invalid response format');
    }
  }

  private sendError(res: ServerResponse, statusCode: number, message: string): void {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    logger.warn(`[ProxyHandler] Sending error ${statusCode}: ${message}`);

    const settings = ConfigManager.getSettings();
    setCorsHeaders(res, settings);

    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(statusCode);
    res.end(message);
  }

  handleOptionsRequest(req: IncomingMessage, res: ServerResponse): void {
    const settings = ConfigManager.getSettings();
    setCorsHeaders(res, settings);

    if (settings.allowCrossDomain) {
      res.setHeader('Access-Control-Max-Age', CACHE_MAX_AGE_SECONDS.toString());
    }

    res.writeHead(204);
    res.end();
  }

  private async buildRequestContext(req: IncomingMessage): Promise<HttpRequestContext> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }

    let body: Buffer | undefined;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      body = await this.collectRequestBody(req);
    }

    return {
      method: req.method || 'GET',
      headers,
      body,
    };
  }

  private collectRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let settled = false;

      const cleanup = () => {
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        req.removeListener('error', onError);
        req.removeListener('close', onClose);
      };

      const settle = <T>(fn: () => T): T | undefined => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutHandle);
          cleanup();
          return fn();
        }
        return undefined;
      };

      const timeoutHandle = setTimeout(() => {
        settle(() => reject(new Error('Request body collection timed out')));
      }, 30000);

      const onData = (chunk: Buffer) => {
        if (settled) return;
        totalSize += chunk.length;
        if (totalSize > MAX_REQUEST_BODY_SIZE) {
          settle(() => reject(new Error('Request body too large')));
          return;
        }
        chunks.push(chunk);
      };

      const onEnd = () =>
        settle(() => resolve(chunks.length === 0 ? undefined : Buffer.concat(chunks)));

      const onError = (error: Error) => settle(() => reject(error));

      const onClose = () =>
        settle(() => reject(new Error('Client disconnected during body collection')));

      req.on('data', onData);
      req.on('end', onEnd);
      req.on('error', onError);
      req.on('close', onClose);
    });
  }
}
