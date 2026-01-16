import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { logger } from './utils/logger';
import { ConfigManager } from './config';
import { LegacyServer } from './legacy-server';
import { injectPolyfills } from './utils/htmlInjector';
import axios from 'axios';

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

      let targetUrl: URL;
      let hostname: string;
      let urlPath: string;

      // Check if this is a proxy-style request (starts with http://)
      if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
        // Proxy-style request: GET http://example.com/path HTTP/1.1
        targetUrl = new URL(req.url);
        hostname = targetUrl.hostname;
        urlPath = targetUrl.pathname + targetUrl.search;
      } else if (req.url.startsWith('/http://') || req.url.startsWith('/https://')) {
        // Path-based proxy request: GET /http://example.com/path HTTP/1.1
        // Strip leading slash and parse as URL
        const urlWithoutSlash = req.url.substring(1);
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
          this.sendResponse(res, gameZipResult.data, gameZipResult.contentType, 'gamezipserver');
          return;
        }
      }

      // Step 2: Try legacy file serving (local htdocs + external fallbacks)
      logger.debug(`[ProxyHandler] Trying legacy server...`);
      const legacyResult = await this.legacyServer.serveLegacy(hostname, urlPath);

      logger.info(`[ProxyHandler] ✓ Served from ${legacyResult.source}`);
      this.sendResponse(res, legacyResult.data, legacyResult.contentType, legacyResult.source);

    } catch (error) {
      logger.error('[ProxyHandler] Error handling request:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        this.sendError(res, 404, 'File not found in any source');
      } else {
        this.sendError(res, 500, 'Internal server error');
      }
    }
  }

  /**
   * Try to fetch from GameZip server
   */
  private async tryGameZipServer(
    hostname: string,
    urlPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      // Make proxy-style request to GameZip server
      // The GameZip server also accepts proxy-style requests: GET http://hostname/path HTTP/1.1
      const gameZipServerUrl = `http://localhost:${this.settings.gameZipPort}`;
      const targetUrl = `http://${hostname}${urlPath}`;
      const requestUrl = `${gameZipServerUrl}/${targetUrl}`;

      const response = await axios.get(requestUrl, {
        responseType: 'arraybuffer',
        timeout: 5000, // Quick timeout for local server
        validateStatus: (status) => status === 200,
        proxy: false, // Don't use system proxy
      });

      const data = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      return { data, contentType };
    } catch (error) {
      // GameZip server not available or file not found
      logger.debug(`[ProxyHandler] GameZip unavailable or file not found`);
      return null;
    }
  }

  /**
   * Send successful response
   */
  private sendResponse(res: ServerResponse, data: Buffer, contentType: string, source: string): void {
    // Process HTML files to inject polyfills for better game compatibility
    let fileData = data;
    if (contentType.includes('text/html')) {
      fileData = injectPolyfills(data);
      logger.info(`[ProxyHandler] Injected polyfills into HTML file`);
    }

    // CORS headers
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
    }

    // Content headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('X-Source', source); // Debug header

    // Connection keep-alive
    res.setHeader('Connection', 'keep-alive');

    res.writeHead(200);
    res.end(fileData);
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
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    res.writeHead(204);
    res.end();
  }
}
