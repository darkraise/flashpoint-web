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

// Maximum request body size for CGI (10MB)
const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024;

// Internal request timeout constants (G-H2)
const STREAM_TIMEOUT_MS = 120000; // 2 minutes for streaming responses

// Cache control constants
const CACHE_MAX_AGE_SECONDS = 86400; // 24 hours (in seconds)

// Allowlist of safe CGI response headers to forward
// Prevents header injection attacks (e.g., Set-Cookie, Location, CORS overrides)
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

  /**
   * Handle incoming HTTP proxy request
   * Replicates the request processing flow from Go's goproxy
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      logger.info(`[ProxyHandler] ${req.method} ${req.url}`);

      // Parse the request URL
      // For proxy requests, req.url contains the full URL: http://example.com/path
      // For regular requests, req.url contains just the path: /path
      if (!req.url) {
        this.sendError(res, 400, 'Bad Request: No URL');
        return;
      }

      let targetUrl: URL;
      let hostname: string;
      let urlPath: string;

      // Normalize malformed URLs: /http:/domain → /http://domain
      // This is a common pattern in legacy Flash games
      let normalizedUrl = req.url;
      if (normalizedUrl.match(/^\/https?:\/[^\/]/)) {
        // Single slash after protocol - insert the missing slash
        normalizedUrl = normalizedUrl.replace(/^(\/https?:)\//, '$1//');
        logger.debug(`[ProxyHandler] Normalized malformed URL`);
      }

      // Check if this is a proxy-style request (starts with http://)
      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        // Proxy-style request: GET http://example.com/path HTTP/1.1
        targetUrl = new URL(normalizedUrl);
        hostname = targetUrl.hostname;
        urlPath = targetUrl.pathname + targetUrl.search;
      } else if (normalizedUrl.startsWith('/http://') || normalizedUrl.startsWith('/https://')) {
        // Path-based proxy request: GET /http://example.com/path HTTP/1.1
        // Strip leading slash and parse as URL
        const urlWithoutSlash = normalizedUrl.substring(1);
        targetUrl = new URL(urlWithoutSlash);
        hostname = targetUrl.hostname;
        urlPath = targetUrl.pathname + targetUrl.search;
      } else {
        // Regular request: GET /path HTTP/1.1 with Host header
        hostname = req.headers.host || 'localhost';
        urlPath = req.url;
        targetUrl = new URL(`http://${hostname}${urlPath}`);
      }

      // Strip port from hostname (Host header may include port, e.g., "example.com:8080")
      hostname = hostname.split(':')[0];

      // Validate hostname to prevent SSRF and other host-based attacks
      try {
        hostname = validateHostname(hostname);
      } catch (error) {
        this.sendError(res, 400, 'Bad Request: Invalid hostname');
        return;
      }

      logger.info(`[ProxyHandler] Parsed - Host: ${hostname}, Path: ${urlPath}`);

      // Step 1: Try GameZip server first (in-process)
      {
        logger.debug(`[ProxyHandler] Trying GameZip server...`);
        const gameZipResult = await this.tryGameZipServer(hostname, urlPath);
        if (gameZipResult) {
          logger.info(`[ProxyHandler] ✓ Served from GameZip`);
          this.sendResponse(res, { ...gameZipResult, source: 'gamezipserver' }, 'gamezipserver');
          return;
        }
      }

      // Step 2: Try legacy file serving (local htdocs + external CDN)
      // This handles games whose content is in htdocs or available from external sources.
      const requestContext = await this.buildRequestContext(req);
      logger.debug(`[ProxyHandler] Trying legacy server...`);
      const legacyResult = await this.legacyServer.serveLegacy(hostname, urlPath, requestContext);

      logger.info(`[ProxyHandler] ✓ Served from ${legacyResult.source}`);
      this.sendResponse(res, legacyResult, legacyResult.source);
    } catch (error) {
      // Sanitize error message before logging to prevent path leakage (G-H4)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const safeMessage = sanitizeErrorMessage(errorMessage);
      logger.error(`[ProxyHandler] Error handling request: ${safeMessage}`);

      // Never expose internal error details to client (G-H4)
      this.sendError(res, 500, 'Internal server error');
    }
  }

  /**
   * Try to find file from GameZip server (direct in-process call)
   * Returns the file data if found in a mounted ZIP, or null to fall through
   * to the legacy server fallback chain.
   */
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

        // Don't inject polyfills here - sendResponse() handles it for all HTML responses
        return { data: result.data, contentType, statusCode: 200 };
      }

      // File not found in any mounted ZIP.
      // Return null so the request falls through to the legacy server,
      // which can serve the file from local htdocs or external CDN sources.
      // If a ZIP download is in progress, the frontend already shows a
      // download UI and won't try to load game content until it completes.
      return null;
    } catch (error) {
      logger.debug(`[ProxyHandler] GameZip lookup failed`);
      return null;
    }
  }

  /**
   * Send successful response (supports both buffered and streamed responses)
   */
  private sendResponse(res: ServerResponse, result: LegacyFileResponse, source: string): void {
    const settings = ConfigManager.getSettings();
    const contentType = result.contentType;
    const statusCode = result.statusCode || 200;

    // CORS headers
    setCorsHeaders(res, settings);

    // Common headers
    res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-Source', source); // Debug header
    }
    res.setHeader('Connection', 'keep-alive');

    // Add CGI response headers if present (allowlist approach to prevent header injection)
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        const lowerKey = key.toLowerCase();
        // Only forward safe, known headers from CGI responses
        if (!ALLOWED_CGI_HEADERS.has(lowerKey)) {
          continue;
        }
        // Reject header values containing CR or LF to prevent header injection
        if (/[\r\n]/.test(value)) {
          logger.warn(`[Security] CGI header value contains CRLF, skipping: ${key}`);
          continue;
        }
        res.setHeader(key, value);
      }
    }

    if (result.stream) {
      // Streaming response for large non-HTML files
      res.setHeader('Content-Type', contentType);
      if (result.size !== undefined) {
        res.setHeader('Content-Length', result.size);
      }
      res.writeHead(statusCode);

      // Set up streaming timeout (G-H2)
      // This prevents hung connections from consuming resources indefinitely
      const streamTimeout = setTimeout(() => {
        logger.warn('[ProxyHandler] Stream timeout - closing connection');
        result.stream?.destroy(new Error('Stream timeout'));
        if (!res.writableEnded) {
          res.end();
        }
      }, STREAM_TIMEOUT_MS);

      // Clean up stream if client disconnects
      res.on('close', () => {
        clearTimeout(streamTimeout);
        if (result.stream && !result.stream.destroyed) {
          result.stream.destroy();
        }
      });

      result.stream.pipe(res);

      result.stream.on('error', (err) => {
        clearTimeout(streamTimeout);
        // Sanitize stream errors to prevent path leakage (G-H4)
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
      // Buffered response (HTML files that need polyfill injection)
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
      // Should never happen, but handle gracefully
      logger.error('[ProxyHandler] Invalid response: neither data nor stream provided');
      this.sendError(res, 500, 'Internal server error: invalid response format');
    }
  }

  /**
   * Send error response
   */
  private sendError(res: ServerResponse, statusCode: number, message: string): void {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    logger.warn(`[ProxyHandler] Sending error ${statusCode}: ${message}`);

    const settings = ConfigManager.getSettings();
    // IMPORTANT: Set CORS headers even for error responses
    // Otherwise browsers will show CORS error instead of the actual error
    setCorsHeaders(res, settings);

    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(statusCode);
    res.end(message);
  }

  /**
   * Handle OPTIONS request for CORS preflight
   */
  handleOptionsRequest(req: IncomingMessage, res: ServerResponse): void {
    const settings = ConfigManager.getSettings();
    setCorsHeaders(res, settings);

    if (settings.allowCrossDomain) {
      res.setHeader('Access-Control-Max-Age', CACHE_MAX_AGE_SECONDS.toString());
    }

    res.writeHead(204);
    res.end();
  }

  /**
   * Build HTTP request context for CGI execution
   * Collects method, headers, and body from the incoming request
   */
  private async buildRequestContext(req: IncomingMessage): Promise<HttpRequestContext> {
    // Convert IncomingHttpHeaders to Record<string, string>
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }

    // Collect request body for POST/PUT requests
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

  /**
   * Collect request body with size limit and timeout
   */
  private collectRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      let settled = false;

      const settle = <T>(fn: () => T): T | undefined => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutHandle);
          return fn();
        }
        return undefined;
      };

      const timeoutHandle = setTimeout(() => {
        settle(() => {
          req.removeAllListeners('data');
          reject(new Error('Request body collection timed out'));
        });
      }, 30000);

      req.on('data', (chunk: Buffer) => {
        if (settled) return;
        totalSize += chunk.length;
        if (totalSize > MAX_REQUEST_BODY_SIZE) {
          settle(() => reject(new Error('Request body too large')));
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () =>
        settle(() => resolve(chunks.length === 0 ? undefined : Buffer.concat(chunks)))
      );
      req.on('error', (error) => settle(() => reject(error)));
    });
  }
}
