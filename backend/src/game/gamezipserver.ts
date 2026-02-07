import http from 'http';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { zipManager } from './zip-manager';
import { ConfigManager, MAX_BUFFERED_FILE_SIZE } from './config';
import { getMimeType } from './mimeTypes';
import { injectPolyfills } from './utils/htmlInjector';
import { setCorsHeaders } from './utils/cors';
import { sanitizeUrlPath, sanitizeErrorMessage } from './utils/pathSecurity';
import { validateGameId, validateHostname } from './validation/schemas';
import { gameDataDownloader } from './services';

/** Escape HTML special characters to prevent XSS in loading page */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/**
 * Download progress tracking for in-progress downloads
 * Used to show loading page while game is being downloaded
 */
interface DownloadProgress {
  startTime: number;
  progress: number;
  total: number | null;
  source: string;
  zipPath: string;
}

/** Map of gameId -> download progress for in-progress downloads */
const downloadsInProgress = new Map<string, DownloadProgress>();

/** Maximum concurrent downloads */
const MAX_CONCURRENT_DOWNLOADS = 3;

/** Cleanup stale downloads older than 10 minutes */
const DOWNLOAD_STALE_MS = 10 * 60 * 1000;

/**
 * GameZip Server - Direct-call interface for mounting/serving files from ZIP archives
 * Refactored from game-service to expose methods instead of running an HTTP server
 */
export class GameZipServer {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup of stale downloads (every 60 seconds)
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleDownloads();
    }, 60000);
    this.cleanupInterval.unref(); // Don't prevent graceful shutdown
  }

  /**
   * Dispose of the server and stop cleanup intervals
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Mount a ZIP file directly (no HTTP)
   * Returns { success, downloading?, statusCode }
   */
  async mountZip(params: {
    id: string;
    zipPath: string;
    gameId?: string;
    dateAdded?: string;
    sha256?: string;
  }): Promise<{ success: boolean; downloading?: boolean; statusCode: number }> {
    const { id, zipPath, gameId, dateAdded, sha256 } = params;

    // Validate mount ID using Zod schema
    try {
      validateGameId(id);
    } catch (error) {
      logger.warn(`[Security] Invalid mount ID detected: ${id}`);
      return { success: false, statusCode: 400 };
    }

    if (!zipPath) {
      return { success: false, statusCode: 400 };
    }

    // Validate ZIP path to prevent directory traversal
    const flashpointPath =
      process.env.FLASHPOINT_PATH ||
      (process.env.NODE_ENV === 'production' ? '/data/flashpoint' : 'D:/Flashpoint');
    const allowedGamesPath =
      process.env.FLASHPOINT_GAMES_PATH || path.join(flashpointPath, 'Data', 'Games');

    try {
      const normalizedZipPath = path.normalize(zipPath);
      const resolvedZipPath = path.resolve(normalizedZipPath);
      const resolvedGamesPath = path.resolve(allowedGamesPath);

      if (
        !resolvedZipPath.startsWith(resolvedGamesPath + path.sep) &&
        resolvedZipPath !== resolvedGamesPath
      ) {
        logger.warn(`[Security] ZIP path outside allowed directory: ${zipPath}`);
        return { success: false, statusCode: 403 };
      }
    } catch (error) {
      logger.error('[Security] ZIP path validation error:', error);
      return { success: false, statusCode: 400 };
    }

    // Check if ZIP file exists locally
    let zipExists = false;
    try {
      await fs.access(zipPath);
      zipExists = true;
    } catch {
      zipExists = false;
    }

    // If ZIP doesn't exist and we have download parameters, start background download
    if (!zipExists && gameId && dateAdded) {
      if (downloadsInProgress.has(gameId)) {
        logger.info(`[GameZipServer] Download already in progress for game ${gameId}`);
        return { success: true, downloading: true, statusCode: 202 };
      }

      // Check if we've hit the concurrent download limit
      if (downloadsInProgress.size >= MAX_CONCURRENT_DOWNLOADS) {
        logger.warn(
          `[GameZipServer] Too many concurrent downloads (${downloadsInProgress.size}), rejecting ${gameId}`
        );
        return { success: false, statusCode: 503 };
      }

      logger.info(
        `[GameZipServer] ZIP not found locally, starting background download for game ${gameId}`
      );

      downloadsInProgress.set(gameId, {
        startTime: Date.now(),
        progress: 0,
        total: null,
        source: 'Starting...',
        zipPath,
      });

      this.downloadAndMountInBackground(
        id,
        gameId,
        dateAdded,
        sha256,
        zipPath,
        allowedGamesPath
      ).catch((err) => logger.error('[GameZipServer] Background download failed:', err));

      return { success: true, downloading: true, statusCode: 202 };
    } else if (!zipExists) {
      return { success: false, statusCode: 404 };
    }

    // Mount the ZIP (file exists locally)
    try {
      await zipManager.mount(id, zipPath);

      // After the mount succeeds, verify the real path hasn't changed (TOCTOU protection)
      try {
        const realPath = await fs.realpath(zipPath);
        const resolvedReal = path.resolve(realPath);
        const resolvedGamesPath = path.resolve(allowedGamesPath);
        if (
          !resolvedReal.startsWith(resolvedGamesPath + path.sep) &&
          resolvedReal !== resolvedGamesPath
        ) {
          // Symlink pointed outside allowed directory - unmount immediately
          logger.warn(`[GameZipServer] Symlink detected: ${zipPath} -> ${realPath}. Unmounting.`);
          await zipManager.unmount(id);
          return { success: false, statusCode: 403 };
        }
      } catch (realPathError) {
        logger.warn(`[GameZipServer] Failed to resolve real path for ${zipPath}:`, realPathError);
        // Continue - the file was already successfully opened by zipManager
      }

      return { success: true, statusCode: 200 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mount failed';
      const safeMessage = sanitizeErrorMessage(errorMessage);
      logger.error(`[GameZipServer] Mount failed: ${safeMessage}`);
      return { success: false, statusCode: 500 };
    }
  }

  /**
   * Unmount a ZIP file directly (no HTTP)
   */
  async unmountZip(id: string): Promise<boolean> {
    try {
      validateGameId(id);
    } catch (error) {
      logger.warn(`[Security] Invalid mount ID detected: ${id}`);
      return false;
    }
    return await zipManager.unmount(id);
  }

  /**
   * List all mounted ZIPs
   */
  listMounts(): Array<{ id: string; zipPath: string; mountTime: Date; fileCount: number }> {
    return zipManager.getMountedZips();
  }

  /**
   * Handle file request from mounted ZIPs (compatible with both raw HTTP and Express)
   * Supports proxy-style requests: GET http://domain.com/path HTTP/1.1
   */
  async handleFileRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (!req.url) {
      this.sendError(res, 400, 'Bad Request: No URL');
      return;
    }

    let hostname: string;
    let urlPath: string;

    // Normalize malformed URLs: /http:/domain → /http://domain
    // This is a common pattern in legacy Flash games
    let normalizedUrl = req.url;
    if (normalizedUrl.match(/^\/https?:\/[^\/]/)) {
      // Single slash after protocol - insert the missing slash
      normalizedUrl = normalizedUrl.replace(/^(\/https?:)\//, '$1//');
      logger.debug(`[GameZipServer] Normalized malformed URL: ${req.url} → ${normalizedUrl}`);
    }

    // Parse URL (same logic as main proxy server)
    try {
      if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
        // Proxy-style: GET http://domain.com/path HTTP/1.1
        const targetUrl = new URL(normalizedUrl);
        hostname = targetUrl.hostname;
        urlPath = targetUrl.pathname + targetUrl.search;
      } else if (normalizedUrl.startsWith('/http://') || normalizedUrl.startsWith('/https://')) {
        // Path-based: GET /http://domain.com/path HTTP/1.1
        const urlWithoutSlash = normalizedUrl.substring(1);
        const targetUrl = new URL(urlWithoutSlash);
        hostname = targetUrl.hostname;
        urlPath = targetUrl.pathname + targetUrl.search;
      } else {
        // Regular: GET /path HTTP/1.1
        // Strip port from hostname (e.g., "localhost:3100" -> "localhost")
        hostname = (req.headers.host || 'localhost').split(':')[0];
        urlPath = normalizedUrl;
      }
    } catch (error) {
      logger.error(`[GameZipServer] Invalid URL: ${normalizedUrl}`);
      this.sendError(res, 400, 'Invalid URL format');
      return;
    }

    // Validate hostname using Zod schema
    try {
      hostname = validateHostname(hostname);
    } catch (error) {
      logger.error(`[GameZipServer] Invalid hostname: ${hostname}`, error);
      this.sendError(res, 400, 'Invalid hostname');
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

    logger.debug(`[GameZipServer] Looking for: ${relPath}`);

    // Search mounted ZIPs
    const result = await zipManager.findFile(relPath);

    if (!result) {
      // Check if a download is in progress for any game
      // The mount ID is typically the gameId
      const downloadStatus = this.findActiveDownload(relPath);

      if (downloadStatus) {
        logger.info(
          `[GameZipServer] File not ready, download in progress for ${downloadStatus.gameId}`
        );
        this.sendLoadingPage(res, downloadStatus.gameId, downloadStatus.progress);
        return;
      }

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
    logger.info(
      `[GameZipServer] ✓ Serving from ZIP ${result.mountId}: ${relPath} (${fileData.length} bytes)`
    );

    // Get settings for CORS configuration
    const settings = ConfigManager.getSettings();

    // CORS headers
    setCorsHeaders(res, settings);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-Source', `gamezipserver:${result.mountId}`);
    }
    res.setHeader('Connection', 'keep-alive');

    res.writeHead(200);
    res.end(fileData);
  }

  /**
   * Download ZIP and mount it in background
   * This runs asynchronously - errors are logged but don't affect the HTTP response
   */
  private async downloadAndMountInBackground(
    mountId: string,
    gameId: string,
    dateAdded: string,
    sha256: string | undefined,
    zipPath: string,
    targetPath: string
  ): Promise<void> {
    try {
      const result = await gameDataDownloader.download(
        {
          gameId,
          dateAdded,
          sha256,
          targetPath,
        },
        (downloaded, total, source) => {
          try {
            // Update progress tracking
            const existing = downloadsInProgress.get(gameId);
            if (existing) {
              downloadsInProgress.set(gameId, {
                ...existing,
                progress: downloaded,
                total,
                source,
              });
            }
            const progress = total ? Math.round((downloaded / total) * 100) : 0;
            logger.debug(
              `[GameZipServer] Download progress for ${gameId}: ${progress}% from ${source}`
            );
          } catch (error) {
            logger.error(`[GameZipServer] Progress callback error for ${gameId}:`, error);
          }
        }
      );

      if (result.success && result.filePath) {
        logger.info(`[GameZipServer] Successfully downloaded ZIP from "${result.sourceUsed}"`);

        // Validate downloaded file path before mounting
        const resolvedFilePath = path.resolve(result.filePath);
        const resolvedAllowedPath = path.resolve(targetPath);
        if (
          !resolvedFilePath.startsWith(resolvedAllowedPath + path.sep) &&
          resolvedFilePath !== resolvedAllowedPath
        ) {
          logger.error(
            `[GameZipServer] Downloaded file path outside allowed directory: ${result.filePath}`
          );
          return;
        }

        // Mount the downloaded ZIP
        try {
          await zipManager.mount(mountId, result.filePath);
          logger.info(`[GameZipServer] ✓ ZIP downloaded and mounted for game ${gameId}`);
        } catch (mountError) {
          const errorMessage = mountError instanceof Error ? mountError.message : 'Mount failed';
          logger.error(`[GameZipServer] Failed to mount downloaded ZIP: ${errorMessage}`);
        }
      } else {
        logger.error(`[GameZipServer] Download failed for ${gameId}: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[GameZipServer] Background download error for ${gameId}: ${errorMsg}`);
    } finally {
      // Remove from in-progress tracking
      downloadsInProgress.delete(gameId);
    }
  }

  /**
   * Clean up stale downloads older than DOWNLOAD_STALE_MS
   */
  private cleanupStaleDownloads(): void {
    const now = Date.now();
    for (const [gameId, progress] of downloadsInProgress.entries()) {
      if (now - progress.startTime > DOWNLOAD_STALE_MS) {
        logger.warn(`[GameZipServer] Removing stale download for ${gameId}`);
        downloadsInProgress.delete(gameId);
      }
    }
  }

  /**
   * Find an active download that might be related to the requested file path
   * Returns the download status if found, null otherwise
   */
  private findActiveDownload(
    relPath: string
  ): { gameId: string; progress: DownloadProgress } | null {
    // Clean up stale downloads first
    this.cleanupStaleDownloads();

    // Extract hostname from relPath (format: hostname/path/to/file)
    const hostname = relPath.split('/')[0]?.toLowerCase();

    // Try to find a download matching this hostname
    if (hostname) {
      for (const [gameId, download] of downloadsInProgress.entries()) {
        // Check if mount ID or ZIP path contains the hostname
        if (gameId.toLowerCase().includes(hostname)) {
          return { gameId, progress: download };
        }
        // Also check the ZIP path for hostname match
        const zipFilename = download.zipPath.toLowerCase();
        if (zipFilename.includes(hostname)) {
          return { gameId, progress: download };
        }
      }
    }

    // No matching download found - return null for a proper 404
    return null;
  }

  /**
   * Send a loading page while game is being downloaded
   * Uses auto-refresh to poll until game is ready
   */
  private sendLoadingPage(
    res: http.ServerResponse,
    gameId: string,
    progress: DownloadProgress
  ): void {
    if (res.headersSent) {
      res.end();
      return;
    }

    const progressPercent = progress.total
      ? Math.round((progress.progress / progress.total) * 100)
      : 0;

    const progressMB = (progress.progress / (1024 * 1024)).toFixed(1);
    const totalMB = progress.total ? (progress.total / (1024 * 1024)).toFixed(1) : '?';

    const elapsedSec = Math.round((Date.now() - progress.startTime) / 1000);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="2">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Downloading Game...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f0f0f;
      color: #e5e5e5;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #333;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 500;
      margin-bottom: 16px;
      color: #f5f5f5;
    }
    .progress-bar {
      background: #262626;
      border-radius: 8px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-fill {
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      height: 100%;
      width: ${progressPercent}%;
      transition: width 0.3s ease;
    }
    .progress-text {
      color: #a3a3a3;
      font-size: 0.875rem;
      margin-bottom: 8px;
    }
    .source {
      color: #737373;
      font-size: 0.75rem;
    }
    .refresh-note {
      color: #525252;
      font-size: 0.75rem;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Downloading Game Data...</h2>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    <p class="progress-text">${escapeHtml(progressMB)} MB / ${escapeHtml(totalMB)} MB (${escapeHtml(String(progressPercent))}%)</p>
    <p class="source">Downloading from configured source...</p>
    <p class="refresh-note">Elapsed: ${escapeHtml(String(elapsedSec))}s &middot; Page refreshes automatically</p>
  </div>
</body>
</html>`;

    const settings = ConfigManager.getSettings();
    setCorsHeaders(res, settings);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; script-src 'none'"
    );
    res.writeHead(202); // 202 Accepted - still processing
    res.end(html);
  }

  /**
   * Send error response
   */
  private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
    if (res.headersSent) {
      res.end();
      return;
    }

    logger.warn(`[GameZipServer] Sending error ${statusCode}: ${message}`);

    // Set CORS headers even for error responses
    const settings = ConfigManager.getSettings();
    setCorsHeaders(res, settings);

    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(statusCode);
    res.end(message);
  }
}

export const gameZipServer = new GameZipServer();
