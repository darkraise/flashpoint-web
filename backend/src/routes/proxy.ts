import { Router, Response, NextFunction } from 'express';
import { config, getExternalImageUrls } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import axios from 'axios';

const router = Router();

/**
 * Validate path to prevent directory traversal attacks
 * @param requestedPath - The path from the request
 * @param allowedBasePath - The allowed base directory
 * @returns Validated safe path or null if invalid
 */
function validatePath(requestedPath: string, allowedBasePath: string): string | null {
  try {
    // Normalize the requested path to remove . and .. sequences
    const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Join with base path
    const fullPath = path.join(allowedBasePath, normalizedPath);

    // Resolve to absolute path
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(allowedBasePath);

    // Verify the resolved path is within the allowed directory
    if (!resolvedPath.startsWith(resolvedBase)) {
      logger.warn(`[Security] Path traversal attempt detected: ${requestedPath}`);
      return null;
    }

    return resolvedPath;
  } catch (error) {
    logger.error('[Security] Path validation error:', error);
    return null;
  }
}

/**
 * Helper function to serve file with external CDN fallback
 */
async function serveFileWithFallback(
  localPath: string,
  relativePath: string,
  externalBaseUrls: string[],
  res: Response,
  next: NextFunction
) {
  try {
    // Try local file first
    if (fs.existsSync(localPath)) {
      logger.debug(`[Proxy] Serving local file: ${localPath}`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(localPath);
    }

    // Try external CDN fallback
    logger.debug(`[Proxy] Local file not found, trying external CDN: ${relativePath}`);

    for (const baseUrl of externalBaseUrls) {
      try {
        const externalUrl = `${baseUrl.trim()}/${relativePath}`;
        logger.debug(`[Proxy] Attempting to fetch from: ${externalUrl}`);

        const response = await axios.get(externalUrl, {
          responseType: 'arraybuffer',
          timeout: 10000, // 10 second timeout
          validateStatus: (status) => status === 200,
        });

        if (response.status === 200 && response.data) {
          logger.info(`[Proxy] Successfully fetched from external CDN: ${externalUrl}`);

          const imageBuffer = Buffer.from(response.data);

          // Cache the image locally for future use (async, don't wait)
          (async () => {
            try {
              // Create directory structure if it doesn't exist
              const dir = path.dirname(localPath);
              await fsPromises.mkdir(dir, { recursive: true });

              // Save the image file
              await fsPromises.writeFile(localPath, imageBuffer);
              logger.info(`[Proxy] Cached image locally: ${localPath}`);
            } catch (cacheError) {
              // Log cache errors but don't fail the request
              logger.warn(
                `[Proxy] Failed to cache image locally: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`
              );
            }
          })().catch((err) => {
            logger.warn('[Proxy] Cache write failed:', err);
          });

          // Determine content type from file extension (not from CDN response)
          const ext = path.extname(relativePath).slice(1).toLowerCase();
          const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            bmp: 'image/bmp',
          };
          const contentType = mimeMap[ext] || 'application/octet-stream';

          res.setHeader('Content-Type', contentType);
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

          return res.send(imageBuffer);
        }
      } catch (err) {
        logger.debug(
          `[Proxy] Failed to fetch from ${baseUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
        // Continue to next URL
      }
    }

    // If all attempts failed, return 404
    logger.warn(`[Proxy] Image not found locally or on CDN: ${relativePath}`);
    res.status(404).json({
      error: {
        message: 'Image not found',
        statusCode: 404,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Note: Game content is now served directly via /game-proxy and /game-zip routes
// (registered in server.ts before middleware). No proxy to external game-service needed.

// Serve images with CDN fallback
router.get(
  '/images/:path(*)',
  asyncHandler(async (req, res, next) => {
    const relativePath = req.params.path;

    // Validate path to prevent directory traversal
    const localPath = validatePath(relativePath, config.flashpointImagesPath);

    if (!localPath) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          statusCode: 403,
        },
      });
    }

    // Get external image URLs dynamically from preferences
    const externalImageUrls = await getExternalImageUrls();

    await serveFileWithFallback(localPath, relativePath, externalImageUrls, res, next);
  })
);

// Serve logos with CDN fallback
router.get(
  '/logos/:path(*)',
  asyncHandler(async (req, res, next) => {
    const relativePath = req.params.path;

    // Validate path to prevent directory traversal
    const localPath = validatePath(relativePath, config.flashpointLogosPath);

    if (!localPath) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          statusCode: 403,
        },
      });
    }

    // Get external image URLs dynamically from preferences
    const externalImageUrls = await getExternalImageUrls();

    // For logos, the external path should include 'Logos' subdirectory
    const externalUrls = externalImageUrls.map((url) => `${url}/../Logos`);

    await serveFileWithFallback(localPath, relativePath, externalUrls, res, next);
  })
);

// Serve screenshots with CDN fallback
router.get(
  '/screenshots/:path(*)',
  asyncHandler(async (req, res, next) => {
    const relativePath = `Screenshots/${req.params.path}`;

    // Validate path to prevent directory traversal
    const localPath = validatePath(relativePath, config.flashpointImagesPath);

    if (!localPath) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          statusCode: 403,
        },
      });
    }

    // Get external image URLs dynamically from preferences
    const externalImageUrls = await getExternalImageUrls();

    await serveFileWithFallback(localPath, relativePath, externalImageUrls, res, next);
  })
);

export default router;
