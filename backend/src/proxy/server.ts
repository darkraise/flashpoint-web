import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { getMimeType } from './mimeTypes';
import { zipManager } from './zip-manager';

export interface ProxyConfig {
  proxyPort: number;
  legacyHTDOCSPath: string;
  gameDataPath: string;
  externalFilePaths: string[];
  allowCrossDomain: boolean;
  chunkSize?: number;
}

export class GameProxyServer {
  private app: express.Application;
  private config: ProxyConfig;

  constructor(proxyConfig: ProxyConfig) {
    this.app = express();
    this.config = {
      ...proxyConfig,
      chunkSize: proxyConfig.chunkSize || 8192 // 8KB default chunk size
    };
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS middleware
    if (this.config.allowCrossDomain) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`[Proxy] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Main proxy route - handles all requests
    this.app.get('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.handleProxyRequest(req, res);
      } catch (error) {
        next(error);
      }
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      logger.error('[Proxy] Error:', err);
      res.status(500).json({
        error: {
          message: 'Proxy server error',
          statusCode: 500
        }
      });
    });
  }

  private async handleProxyRequest(req: Request, res: Response): Promise<void> {
    let requestPath = req.path.substring(1); // Remove leading slash

    // Parse URL if the request path is a full URL (e.g., http://domain.com/path)
    const parsedPath = this.parseProxyPath(requestPath);
    requestPath = parsedPath;

    logger.debug(`[Proxy] Resolved path: ${requestPath}`);

    // Try to serve from local paths first
    const localFile = await this.tryLocalPaths(requestPath);

    if (localFile) {
      await this.serveFile(localFile, res);
      return;
    }

    // Try to serve from mounted ZIP files (mimics Flashpoint ZipServer)
    const zipContent = await this.tryZipFiles(requestPath);

    if (zipContent) {
      await this.serveZipContent(zipContent, requestPath, res);
      return;
    }

    // Try external fallback URLs
    const externalContent = await this.tryExternalPaths(requestPath);

    if (externalContent) {
      await this.serveExternalContent(externalContent, res);
      return;
    }

    // File not found
    logger.warn(`[Proxy] File not found: ${requestPath}`);
    res.status(404).json({
      error: {
        message: 'File not found',
        path: requestPath,
        statusCode: 404
      }
    });
  }

  /**
   * Parse proxy path - converts full URLs to local file paths
   * Examples:
   *   http://farm.maxgames.com/game.swf -> farm.maxgames.com/game.swf
   *   https://example.com/path/file.html -> example.com/path/file.html
   *   http://www.example.com/Find%20My%20File.swf -> www.example.com/Find My File.swf
   *   regular/path/file.swf -> regular/path/file.swf (unchanged)
   */
  private parseProxyPath(requestPath: string): string {
    try {
      // Check if it's a full URL (starts with http:// or https://)
      if (requestPath.startsWith('http://') || requestPath.startsWith('https://')) {
        const url = new URL(requestPath);

        // CRITICAL FIX: Decode the pathname to handle URL-encoded characters (spaces, etc.)
        // The JavaScript URL class preserves encoding, but filesystem paths need actual characters
        // This matches how PHP's web server automatically decodes paths for the Flashpoint Launcher
        const decodedPathname = decodeURIComponent(url.pathname);
        const decodedSearch = url.search ? decodeURIComponent(url.search) : '';

        // Combine hostname and decoded pathname, removing leading slash from pathname
        const localPath = url.hostname + decodedPathname + decodedSearch;
        logger.debug(`[Proxy] Parsed URL: ${requestPath} -> ${localPath}`);
        return localPath;
      }

      // If not a URL, return as-is
      return requestPath;
    } catch (error) {
      logger.warn(`[Proxy] Failed to parse URL: ${requestPath}, using as-is`);
      return requestPath;
    }
  }

  private async tryLocalPaths(requestPath: string): Promise<string | null> {
    // Priority order:
    // 1. Legacy htdocs path
    // 2. Game data path

    const pathsToTry = [
      path.join(this.config.legacyHTDOCSPath, requestPath),
      path.join(this.config.gameDataPath, requestPath)
    ];

    for (const filePath of pathsToTry) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            return filePath;
          } else if (stats.isDirectory()) {
            // Try index files
            const indexFiles = ['index.html', 'index.htm', 'index.php'];
            for (const indexFile of indexFiles) {
              const indexPath = path.join(filePath, indexFile);
              if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
                return indexPath;
              }
            }
          }
        }
      } catch (error) {
        logger.debug(`[Proxy] Error checking path ${filePath}:`, error);
      }
    }

    return null;
  }

  /**
   * Try to serve file from mounted ZIP archives in Data/Games
   * This replicates the ZipServer functionality from FlashpointGameServer (port 22501)
   */
  private async tryZipFiles(requestPath: string): Promise<Buffer | null> {
    logger.debug(`[Proxy] Checking ZIP files for: ${requestPath}`);

    try {
      // The zipManager.findFile() already searches all mounted ZIPs
      // It tries multiple path variants: content/, htdocs/, etc.
      const result = await zipManager.findFile(requestPath);

      if (result) {
        logger.info(`[Proxy] ✓ Found in ZIP ${result.mountId}: ${requestPath} (${result.data.length} bytes)`);
        return result.data;
      }

      logger.debug(`[Proxy] File not found in any mounted ZIP: ${requestPath}`);
      return null;
    } catch (error) {
      logger.error(`[Proxy] Error searching ZIP files:`, error);
      return null;
    }
  }

  /**
   * Auto-discover and mount all ZIP files in Data/Games directory
   * This is called on server startup to make game ZIPs available
   */
  private async autoMountZipFiles(): Promise<void> {
    try {
      const gamesPath = this.config.gameDataPath;

      if (!fs.existsSync(gamesPath)) {
        logger.warn(`[Proxy] Games directory not found: ${gamesPath}`);
        logger.warn(`[Proxy] ZIP file serving will be disabled`);
        return;
      }

      logger.info(`[Proxy] Auto-mounting ZIP files from: ${gamesPath}`);

      // Find all .zip files in Data/Games
      const files = fs.readdirSync(gamesPath);
      const zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip'));

      if (zipFiles.length === 0) {
        logger.info(`[Proxy] No ZIP files found in ${gamesPath}`);
        return;
      }

      logger.info(`[Proxy] Found ${zipFiles.length} ZIP file(s) to mount`);

      // Mount each ZIP file
      let mountedCount = 0;
      let failedCount = 0;

      for (const zipFile of zipFiles) {
        try {
          const zipPath = path.join(gamesPath, zipFile);
          // Use filename (without extension) as mount ID
          const mountId = path.basename(zipFile, '.zip');

          await zipManager.mount(mountId, zipPath);
          mountedCount++;
        } catch (error) {
          logger.warn(`[Proxy] Failed to mount ${zipFile}:`, error);
          failedCount++;
        }
      }

      logger.info(`[Proxy] ========================================`);
      logger.info(`[Proxy] ZIP Auto-Mount Summary:`);
      logger.info(`[Proxy]   Total found: ${zipFiles.length}`);
      logger.info(`[Proxy]   Mounted: ${mountedCount}`);
      if (failedCount > 0) {
        logger.warn(`[Proxy]   Failed: ${failedCount}`);
      }
      logger.info(`[Proxy] ========================================`);
    } catch (error) {
      logger.error(`[Proxy] Error during ZIP auto-mount:`, error);
    }
  }

  /**
   * Serve content from ZIP file
   */
  private async serveZipContent(content: Buffer, requestPath: string, res: Response): Promise<void> {
    try {
      // Determine MIME type from file extension
      const ext = path.extname(requestPath).substring(1).toLowerCase();
      const mimeType = getMimeType(ext);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', content.length);
      res.setHeader('X-Source', 'zip');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

      res.send(content);

      logger.debug(`[Proxy] Served from ZIP: ${requestPath} (${mimeType}, ${content.length} bytes)`);
    } catch (error) {
      logger.error('[Proxy] Error serving ZIP content:', error);
      throw error;
    }
  }

  /**
   * Encode URL for CDN access:
   * - Ensure path segments are properly encoded
   * - Preserve URL structure (protocol, domain, query params)
   * - Handle already-encoded segments gracefully
   */
  private encodeUrlForCDN(url: string): string {
    try {
      const urlObj = new URL(url);

      // Encode each path segment individually
      // This prevents double-encoding while ensuring special characters are handled
      const pathSegments = urlObj.pathname.split('/');
      const encodedSegments = pathSegments.map(segment => {
        if (!segment) return segment; // Preserve empty segments (leading/trailing slashes)

        try {
          // Try to decode first - if it succeeds, the segment might be already encoded
          const decoded = decodeURIComponent(segment);
          // Re-encode to ensure consistency
          return encodeURIComponent(decoded);
        } catch {
          // If decode fails, segment is either already properly encoded or has invalid encoding
          // Try to encode it directly
          return encodeURIComponent(segment);
        }
      });

      urlObj.pathname = encodedSegments.join('/');

      // Also encode query parameters properly
      if (urlObj.search) {
        const params = new URLSearchParams(urlObj.search);
        urlObj.search = params.toString();
      }

      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, return original URL
      logger.warn(`[Proxy] Failed to encode URL for CDN: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return url;
    }
  }

  private async tryExternalPaths(requestPath: string): Promise<Buffer | null> {
    logger.info(`[Proxy] Trying external CDN for: ${requestPath}`);

    for (const baseUrl of this.config.externalFilePaths) {
      try {
        const url = `${baseUrl.trim()}/${requestPath}`;
        // Encode URL like PHP router does
        const encodedUrl = this.encodeUrlForCDN(url);
        logger.info(`[Proxy] Attempting: ${encodedUrl}`);

        const response = await axios.get(encodedUrl, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
          maxRedirects: 5,
          headers: {
            // Match PHP router's Accept-Encoding header
            'Accept-Encoding': 'identity'
          }
          // Note: Removed validateStatus to allow axios to follow redirects automatically
        });

        if (response.status === 200 && response.data) {
          const buffer = Buffer.from(response.data);

          // Archive.org serves empty files instead of 404s - check for this
          if (buffer.length === 0) {
            logger.info(`[Proxy] ✗ Empty file returned (treated as 404): ${encodedUrl}`);
            continue;
          }

          logger.info(`[Proxy] ✓ Successfully fetched from external: ${encodedUrl} (${buffer.length} bytes)`);

          // Cache the downloaded file locally for future use
          await this.cacheDownloadedFile(requestPath, buffer);

          return buffer;
        }
      } catch (error: any) {
        const errorMsg = error.response?.status
          ? `HTTP ${error.response.status}`
          : error.message || 'Unknown error';
        logger.info(`[Proxy] ✗ Failed (${errorMsg}): ${baseUrl.trim()}/${requestPath}`);
      }
    }

    logger.warn(`[Proxy] All CDN sources exhausted for: ${requestPath}`);
    return null;
  }

  /**
   * Cache downloaded file locally for future use (like Flashpoint Launcher does)
   */
  private async cacheDownloadedFile(requestPath: string, content: Buffer): Promise<void> {
    try {
      // Determine the best local path (prefer Legacy/htdocs)
      const localPath = path.join(this.config.legacyHTDOCSPath, requestPath);
      const dir = path.dirname(localPath);

      // Create directory structure if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(localPath, content);
      logger.info(`[Proxy] Cached downloaded file: ${localPath}`);
    } catch (error) {
      logger.warn(`[Proxy] Failed to cache file locally:`, error);
      // Don't throw - caching is optional, we already have the content
    }
  }

  private async serveFile(filePath: string, res: Response): Promise<void> {
    try {
      const ext = path.extname(filePath).substring(1).toLowerCase();
      const mimeType = getMimeType(ext);

      res.setHeader('Content-Type', mimeType);

      const stats = fs.statSync(filePath);
      res.setHeader('Content-Length', stats.size);

      // Stream file with chunking for large files
      const readStream = fs.createReadStream(filePath, {
        highWaterMark: this.config.chunkSize
      });

      readStream.on('error', (error) => {
        logger.error('[Proxy] Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              message: 'Error streaming file',
              statusCode: 500
            }
          });
        }
      });

      readStream.pipe(res);

      logger.debug(`[Proxy] Serving local file: ${filePath} (${mimeType})`);
    } catch (error) {
      logger.error('[Proxy] Error serving file:', error);
      throw error;
    }
  }

  private async serveExternalContent(content: Buffer, res: Response): Promise<void> {
    try {
      // Try to determine MIME type from content or default to octet-stream
      const mimeType = 'application/octet-stream'; // Will be improved with actual detection

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', content.length);
      res.send(content);
    } catch (error) {
      logger.error('[Proxy] Error serving external content:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    // Auto-mount ZIP files from Data/Games before starting the server
    await this.autoMountZipFiles();

    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.config.proxyPort, () => {
        logger.info(`[Proxy] Game proxy server listening on port ${this.config.proxyPort}`);
        resolve();
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`[Proxy] Port ${this.config.proxyPort} is already in use.`);
          logger.error('[Proxy] Please check if another instance is running or change PROXY_PORT in .env');
          logger.error('[Proxy] You can find the process using: netstat -ano | findstr :' + this.config.proxyPort);
        } else {
          logger.error('[Proxy] Failed to start proxy server:', error);
        }
        reject(error);
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Factory function to create and start proxy server
export async function createProxyServer(proxyConfig: ProxyConfig): Promise<GameProxyServer> {
  const server = new GameProxyServer(proxyConfig);
  await server.start();
  return server;
}
