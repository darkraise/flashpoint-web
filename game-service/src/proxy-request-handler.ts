import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { Readable } from 'stream';
import { logger } from './utils/logger';
import { ConfigManager } from './config';
import { LegacyServer, HttpRequestContext, LegacyFileResponse } from './legacy-server';
import { injectPolyfills } from './utils/htmlInjector';
import { sanitizeErrorMessage, sanitizeUrlPath } from './utils/pathSecurity';
import axios from 'axios';

// Maximum request body size for CGI (10MB)
const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024;

// Internal request timeout constants (G-H2)
const GAMEZIP_REQUEST_TIMEOUT_MS = 5000; // 5 seconds for local GameZip server
const STREAM_TIMEOUT_MS = 120000; // 2 minutes for streaming responses

// Cache control constants
const CACHE_MAX_AGE_SECONDS = 86400; // 24 hours (in seconds)

export class ProxyRequestHandler {
  private legacyServer: LegacyServer;
  private settings = ConfigManager.getSettings();

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

      // Security check: Sanitize URL path BEFORE any processing (G-H1)
      // This catches double-encoded attacks and dangerous patterns early
      try {
        sanitizeUrlPath(req.url);
      } catch (error) {
        logger.warn(
          `[Security] Invalid URL rejected: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        this.sendError(res, 400, 'Bad Request: Invalid URL');
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

      logger.info(`[ProxyHandler] Parsed - Host: ${hostname}, Path: ${urlPath}`);

      // Step 1: Try GameZip server first (if enabled)
      if (this.settings.gameZipPort) {
        logger.debug(`[ProxyHandler] Trying GameZip server...`);
        const gameZipResult = await this.tryGameZipServer(hostname, urlPath);
        if (gameZipResult) {
          logger.info(`[ProxyHandler] ✓ Served from GameZip`);
          this.sendResponse(res, { ...gameZipResult, source: 'gamezipserver' }, 'gamezipserver');
          return;
        }
      }

      // Step 2: Build request context for CGI support
      const requestContext = await this.buildRequestContext(req);

      // Step 3: Try legacy file serving (local htdocs + external fallbacks)
      logger.debug(`[ProxyHandler] Trying legacy server...`);
      const legacyResult = await this.legacyServer.serveLegacy(hostname, urlPath, requestContext);

      logger.info(`[ProxyHandler] ✓ Served from ${legacyResult.source}`);
      this.sendResponse(res, legacyResult, legacyResult.source);
    } catch (error) {
      // Sanitize error message before logging to prevent path leakage (G-H4)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const safeMessage = sanitizeErrorMessage(errorMessage);
      logger.error(`[ProxyHandler] Error handling request: ${safeMessage}`);

      if (error instanceof Error && error.message.includes('not found')) {
        this.sendError(res, 404, 'File not found');
      } else {
        // Never expose internal error details to client (G-H4)
        this.sendError(res, 500, 'Internal server error');
      }
    }
  }

  /**
   * Try to fetch from GameZip server
   * Note: GameZip server responses are kept buffered since they come from local ZIP archives
   * and are typically already compressed/optimized
   *
   * Implements timeout enforcement (G-H2)
   */
  private async tryGameZipServer(
    hostname: string,
    urlPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    // Create abort controller for request timeout (G-H2)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, GAMEZIP_REQUEST_TIMEOUT_MS);

    try {
      // Make proxy-style request to GameZip server
      // The GameZip server also accepts proxy-style requests: GET http://hostname/path HTTP/1.1
      const gameZipServerUrl = `http://localhost:${this.settings.gameZipPort}`;
      const targetUrl = `http://${hostname}${urlPath}`;
      const requestUrl = `${gameZipServerUrl}/${targetUrl}`;

      const response = await axios.get(requestUrl, {
        responseType: 'arraybuffer',
        timeout: GAMEZIP_REQUEST_TIMEOUT_MS,
        signal: abortController.signal,
        validateStatus: (status) => status === 200,
        proxy: false, // Don't use system proxy
      });

      const data = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      return { data, contentType };
    } catch (error) {
      // GameZip server not available or file not found
      // Don't log detailed errors to avoid path leakage (G-H4)
      logger.debug(`[ProxyHandler] GameZip unavailable or file not found`);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send successful response (supports both buffered and streamed responses)
   */
  private sendResponse(res: ServerResponse, result: LegacyFileResponse, source: string): void {
    const contentType = result.contentType;
    const statusCode = result.statusCode || 200;

    // CORS headers
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
    }

    // Common headers
    res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
    res.setHeader('X-Source', source); // Debug header
    res.setHeader('Connection', 'keep-alive');

    // Add CGI response headers if present
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        // Skip headers that we handle separately
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'content-type' || lowerKey === 'content-length' || lowerKey === 'status') {
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

      result.stream.pipe(res);

      result.stream.on('error', (err) => {
        clearTimeout(streamTimeout);
        // Sanitize stream errors to prevent path leakage (G-H4)
        const safeMessage = sanitizeErrorMessage(err.message || 'Unknown error');
        logger.error(`[ProxyHandler] Stream error: ${safeMessage}`);
        if (!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
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
    logger.warn(`[ProxyHandler] Sending error ${statusCode}: ${message}`);

    // IMPORTANT: Set CORS headers even for error responses
    // Otherwise browsers will show CORS error instead of the actual error
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
    }

    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(statusCode);
    res.end(message);
  }

  /**
   * Handle OPTIONS request for CORS preflight
   */
  handleOptionsRequest(req: IncomingMessage, res: ServerResponse): void {
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
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
      let completed = false;

      // Timeout for body collection (30 seconds)
      const timeoutHandle = setTimeout(() => {
        if (!completed) {
          completed = true;
          req.destroy(new Error('Request body collection timed out'));
          reject(new Error('Request body collection timed out'));
        }
      }, 30000);

      req.on('data', (chunk: Buffer) => {
        if (completed) return;
        totalSize += chunk.length;
        if (totalSize > MAX_REQUEST_BODY_SIZE) {
          completed = true;
          clearTimeout(timeoutHandle);
          req.destroy(new Error('Request body too large'));
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        if (completed) return;
        completed = true;
        clearTimeout(timeoutHandle);
        if (chunks.length === 0) {
          resolve(undefined);
        } else {
          resolve(Buffer.concat(chunks));
        }
      });

      req.on('error', (error) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }
}
