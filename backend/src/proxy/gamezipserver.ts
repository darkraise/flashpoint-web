import http from 'http';
import { URL } from 'url';
import { lookup as mimeLookup } from 'mime-types';
import path from 'path';
import { logger } from '../utils/logger';
import { zipManager } from './zip-manager';
import { ConfigManager } from './config';

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
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

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

    // Build relative path
    const relPath = path.posix.join(hostname, urlPath);

    logger.info(`[GameZipServer] Looking for: ${relPath}`);

    // Search mounted ZIPs
    const result = await zipManager.findFile(relPath);

    if (!result) {
      logger.debug(`[GameZipServer] File not found in any mounted ZIP: ${relPath}`);
      this.sendError(res, 404, 'File not found in mounted ZIPs');
      return;
    }

    // Determine content type
    const ext = path.extname(urlPath).toLowerCase();
    const contentType = mimeLookup(ext) || 'application/octet-stream';

    // Send file
    logger.info(`[GameZipServer] ✓ Serving from ZIP ${result.mountId}: ${relPath} (${result.data.length} bytes)`);

    // CORS headers
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', result.data.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('X-Source', `gamezipserver:${result.mountId}`);
    res.setHeader('Connection', 'keep-alive');

    res.writeHead(200);
    res.end(result.data);
  }

  /**
   * Read request body
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
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
    if (this.settings.allowCrossDomain) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
    }

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
