import http from 'http';
import { URL } from 'url';
import path from 'path';
import { logger } from './utils/logger';
import { zipManager } from './zip-manager';
import { ConfigManager } from './config';
import { getMimeType } from './mimeTypes';
import { injectPolyfills } from './utils/htmlInjector';
import { setCorsHeaders, setCorsHeadersWithMaxAge } from './utils/cors';
import { sanitizeUrlPath } from './utils/pathSecurity';
import { validateGameId, validateHostname } from './validation/schemas';

/**
 * GameZip Server - Serves files from mounted ZIP archives
 * Replicates the GameZip server from FlashpointGameServer (port 22501)
 */
export class GameZipServer {
  private server: http.Server | null = null;
  private settings = ConfigManager.getSettings();

  /**
   * Start the GameZip server
   */
  async start(): Promise<http.Server> {
    const server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (error) {
        logger.error('[GameZipServer] Unhandled error:', error);

        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      }
    });

    // Configure server settings
    server.timeout = 120000; // 2 minutes timeout
    server.keepAliveTimeout = 65000; // 65 seconds keep-alive

    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.listen(this.settings.gameZipPort, () => {
        logger.info(`[GameZipServer] ========================================`);
        logger.info(`[GameZipServer] GameZip Server started`);
        logger.info(`[GameZipServer] Port: ${this.settings.gameZipPort}`);
        logger.info(`[GameZipServer] ========================================`);
        resolve();
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`[GameZipServer] Port ${this.settings.gameZipPort} is already in use`);
        } else {
          logger.error('[GameZipServer] Failed to start:', error);
        }
        reject(error);
      });
    });

    this.server = server;
    return server;
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const method = req.method;
    const url = req.url || '/';

    logger.info(`[GameZipServer] ${method} ${url}`);

    // Health check endpoint
    if (method === 'GET' && url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'flashpoint-gamezip-server',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Handle different request types
    if (method === 'OPTIONS') {
      this.handleOptionsRequest(req, res);
      return;
    }

    if (method === 'POST' && url.startsWith('/mount/')) {
      await this.handleMount(req, res);
      return;
    }

    if (method === 'DELETE' && url.startsWith('/mount/')) {
      await this.handleUnmount(req, res);
      return;
    }

    if (method === 'GET' && url === '/mounts') {
      this.handleListMounts(req, res);
      return;
    }

    if (method === 'GET' || method === 'HEAD') {
      await this.handleFileRequest(req, res);
      return;
    }

    // Unknown request
    this.sendError(res, 404, 'Not Found');
  }

  /**
   * Handle CORS preflight
   */
  private handleOptionsRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    setCorsHeadersWithMaxAge(res, this.settings, 86400);

    res.writeHead(204);
    res.end();
  }

  /**
   * Handle POST /mount/:id - Mount a ZIP file
   * Body: { zipPath: string }
   */
  private async handleMount(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Extract ID from URL
    const id = req.url?.split('/mount/')[1];
    if (!id) {
      this.sendError(res, 400, 'Missing mount ID');
      return;
    }

    // Validate mount ID using Zod schema (prevents path traversal)
    try {
      validateGameId(id);
    } catch (error) {
      logger.warn(`[Security] Invalid mount ID detected: ${id}`);
      this.sendError(res, 400, error instanceof Error ? error.message : 'Invalid mount ID');
      return;
    }

    // Parse request body
    const body = await this.readBody(req);
    let zipPath: string;

    try {
      const data = JSON.parse(body);
      zipPath = data.zipPath;

      if (!zipPath) {
        this.sendError(res, 400, 'Missing zipPath in request body');
        return;
      }
    } catch (error) {
      this.sendError(res, 400, 'Invalid JSON');
      return;
    }

    // Validate ZIP path to prevent directory traversal
    // Ensure the ZIP file is within the allowed games directory
    try {
      const flashpointPath = process.env.FLASHPOINT_PATH || 'D:/Flashpoint';
      const allowedGamesPath = process.env.FLASHPOINT_GAMES_PATH || path.join(flashpointPath, 'Data', 'Games');

      const normalizedZipPath = path.normalize(zipPath);
      const resolvedZipPath = path.resolve(normalizedZipPath);
      const resolvedGamesPath = path.resolve(allowedGamesPath);

      // Check if the resolved path is within the allowed games directory
      if (!resolvedZipPath.startsWith(resolvedGamesPath)) {
        logger.warn(`[Security] ZIP path outside allowed directory: ${zipPath}`);
        this.sendError(res, 403, 'Forbidden: ZIP file must be within games directory');
        return;
      }
    } catch (error) {
      logger.error('[Security] ZIP path validation error:', error);
      this.sendError(res, 400, 'Invalid ZIP path');
      return;
    }

    // Mount the ZIP
    try {
      await zipManager.mount(id, zipPath);

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, id, zipPath }));
    } catch (error) {
      logger.error(`[GameZipServer] Mount failed:`, error);
      this.sendError(res, 500, error instanceof Error ? error.message : 'Mount failed');
    }
  }

  /**
   * Handle DELETE /mount/:id - Unmount a ZIP file
   */
  private async handleUnmount(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const id = req.url?.split('/mount/')[1];
    if (!id) {
      this.sendError(res, 400, 'Missing mount ID');
      return;
    }

    // Validate mount ID to prevent path traversal
    if (id.includes('/') || id.includes('\\') || id.includes('..') || id.includes('\0')) {
      logger.warn(`[Security] Invalid mount ID detected: ${id}`);
      this.sendError(res, 400, 'Invalid mount ID');
      return;
    }

    const success = await zipManager.unmount(id);

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(success ? 200 : 404);
    res.end(JSON.stringify({ success, id }));
  }

  /**
   * Handle GET /mounts - List all mounted ZIPs
   */
  private handleListMounts(req: http.IncomingMessage, res: http.ServerResponse): void {
    const mounts = zipManager.getMountedZips();

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ mounts }));
  }

  /**
   * Handle GET /* - Serve file from mounted ZIPs
   * Supports proxy-style requests: GET http://domain.com/path HTTP/1.1
   */
  private async handleFileRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (!req.url) {
      this.sendError(res, 400, 'Bad Request: No URL');
      return;
    }

    let hostname: string;
    let urlPath: string;

    // Parse URL (same logic as main proxy server)
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      // Proxy-style: GET http://domain.com/path HTTP/1.1
      const targetUrl = new URL(req.url);
      hostname = targetUrl.hostname;
      urlPath = targetUrl.pathname + targetUrl.search;
    } else if (req.url.startsWith('/http://') || req.url.startsWith('/https://')) {
      // Path-based: GET /http://domain.com/path HTTP/1.1
      const urlWithoutSlash = req.url.substring(1);
      const targetUrl = new URL(urlWithoutSlash);
      hostname = targetUrl.hostname;
      urlPath = targetUrl.pathname + targetUrl.search;
    } else {
      // Regular: GET /path HTTP/1.1
      hostname = req.headers.host || 'localhost';
      urlPath = req.url;
    }

    // Validate hostname using Zod schema
    try {
      hostname = validateHostname(hostname);
    } catch (error) {
      logger.error(`[GameZipServer] Invalid hostname: ${hostname}`);
      this.sendError(res, 400, error instanceof Error ? error.message : 'Invalid hostname');
      return;
    }

    // Sanitize URL path to prevent null bytes and dangerous patterns
    try {
      urlPath = sanitizeUrlPath(urlPath);
    } catch (error) {
      logger.error(`[GameZipServer] Invalid URL path: ${urlPath}`);
      this.sendError(res, 400, 'Invalid URL path');
      return;
    }

    // Strip query string from path for ZIP file lookup
    // Files in ZIPs don't have query strings (e.g., file.swf?token=xyz → file.swf)
    const pathWithoutQuery = urlPath.split('?')[0];

    // Build relative path
    const relPath = path.posix.join(hostname, pathWithoutQuery);

    logger.info(`[GameZipServer] Looking for: ${relPath}`);

    // Search mounted ZIPs
    const result = await zipManager.findFile(relPath);

    if (!result) {
      logger.debug(`[GameZipServer] File not found in any mounted ZIP: ${relPath}`);
      this.sendError(res, 404, 'File not found in mounted ZIPs');
      return;
    }

    // Determine content type (use path without query string)
    const ext = path.extname(pathWithoutQuery).substring(1).toLowerCase();
    const contentType = getMimeType(ext);

    // Process HTML files to inject polyfills for better game compatibility
    let fileData = result.data;
    if (ext === 'html' || ext === 'htm') {
      fileData = injectPolyfills(result.data);
      logger.info(`[GameZipServer] Injected polyfills into HTML file: ${relPath}`);
    }

    // Send file
    logger.info(`[GameZipServer] ✓ Serving from ZIP ${result.mountId}: ${relPath} (${fileData.length} bytes)`);

    // CORS headers
    setCorsHeaders(res, this.settings);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('X-Source', `gamezipserver:${result.mountId}`);
    res.setHeader('Connection', 'keep-alive');

    res.writeHead(200);
    res.end(fileData);
  }

  /**
   * Read request body with size limit to prevent DoS attacks
   */
  private readBody(req: http.IncomingMessage, maxSize: number = 1024 * 1024): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();

        // Check size limit (default 1MB)
        if (body.length > maxSize) {
          req.destroy();
          reject(new Error('Request body too large'));
        }
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  /**
   * Send error response
   */
  private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
    logger.warn(`[GameZipServer] Sending error ${statusCode}: ${message}`);

    // Set CORS headers even for error responses
    setCorsHeaders(res, this.settings);

    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(statusCode);
    res.end(message);
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      logger.info('[GameZipServer] Stopping server...');

      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info('[GameZipServer] Server stopped');
    }

    // Unmount all ZIPs
    await zipManager.unmountAll();
  }
}
