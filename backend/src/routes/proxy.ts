import { Router, Response, NextFunction } from 'express';
import { config, getExternalImageUrls } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import axios from 'axios';

const router = Router();

/** Prevent directory traversal: returns resolved path if within base, null otherwise */
function validatePath(requestedPath: string, allowedBasePath: string): string | null {
  try {
    if (requestedPath.includes('\0')) {
      logger.warn(`[Security] Null byte in path rejected: ${requestedPath}`);
      return null;
    }

    const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(allowedBasePath, normalizedPath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(allowedBasePath);

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

// Prevent duplicate concurrent cache writes for the same file
const pendingCacheWrites = new Set<string>();

async function serveFileWithFallback(
  localPath: string,
  relativePath: string,
  externalBaseUrls: string[],
  res: Response,
  next: NextFunction,
  allowedBasePath: string
) {
  try {
    if (fs.existsSync(localPath)) {
      logger.debug(`[Proxy] Serving local file: ${localPath}`);

      // Resolve symlinks to prevent bypass via symlink to unauthorized location
      try {
        const realPath = await fsPromises.realpath(localPath);
        const realBase = await fsPromises.realpath(allowedBasePath);
        if (!realPath.startsWith(realBase + path.sep) && realPath !== realBase) {
          logger.warn(`[Security] Symlink escape detected: ${localPath} -> ${realPath}`);
          return res.status(403).json({ error: { message: 'Access denied', statusCode: 403 } });
        }
      } catch (realpathError) {
        logger.error('[Security] Symlink resolution error:', realpathError);
        return res.status(500).json({ error: { message: 'Internal error', statusCode: 500 } });
      }

      const ext = path.extname(localPath).slice(1).toLowerCase();
      if (ext === 'svg') {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(localPath);
    }

    logger.debug(`[Proxy] Local file not found, trying external CDN: ${relativePath}`);

    for (const baseUrl of externalBaseUrls) {
      try {
        const externalUrl = `${baseUrl.trim()}/${relativePath}`;
        logger.debug(`[Proxy] Attempting to fetch from: ${externalUrl}`);

        const response = await axios.get(externalUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxContentLength: 10 * 1024 * 1024,
          maxBodyLength: 10 * 1024 * 1024,
          validateStatus: (status) => status === 200,
        });

        if (response.status === 200 && response.data) {
          logger.info(`[Proxy] Successfully fetched from external CDN: ${externalUrl}`);

          const imageBuffer = Buffer.from(response.data);

          if (!pendingCacheWrites.has(localPath) && pendingCacheWrites.size < 100) {
            pendingCacheWrites.add(localPath);
            (async () => {
              try {
                const dir = path.dirname(localPath);
                await fsPromises.mkdir(dir, { recursive: true });
                await fsPromises.writeFile(localPath, imageBuffer);
                logger.info(`[Proxy] Cached image locally: ${localPath}`);
              } catch (cacheError) {
                logger.warn(
                  `[Proxy] Failed to cache image locally: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`
                );
              } finally {
                pendingCacheWrites.delete(localPath);
              }
            })().catch((err) => {
              pendingCacheWrites.delete(localPath);
              logger.warn('[Proxy] Cache write failed:', err);
            });
          }

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
          if (ext === 'svg') {
            res.setHeader(
              'Content-Security-Policy',
              "default-src 'none'; style-src 'unsafe-inline'"
            );
          }
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

          return res.send(imageBuffer);
        }
      } catch (err) {
        logger.debug(
          `[Proxy] Failed to fetch from ${baseUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

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

router.get(
  '/images/:path(*)',
  asyncHandler(async (req, res, next) => {
    const relativePath = req.params.path;

    const localPath = validatePath(relativePath, config.flashpointImagesPath);

    if (!localPath) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          statusCode: 403,
        },
      });
    }

    const externalImageUrls = await getExternalImageUrls();

    await serveFileWithFallback(
      localPath,
      relativePath,
      externalImageUrls,
      res,
      next,
      config.flashpointImagesPath
    );
  })
);

router.get(
  '/logos/:path(*)',
  asyncHandler(async (req, res, next) => {
    const relativePath = req.params.path;

    const localPath = validatePath(relativePath, config.flashpointLogosPath);

    if (!localPath) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          statusCode: 403,
        },
      });
    }

    const externalImageUrls = await getExternalImageUrls();

    // Derive Logos URL from image base URLs by replacing last path segment
    const externalUrls = externalImageUrls.map((url) => {
      try {
        const parsed = new URL(url);
        const segments = parsed.pathname.replace(/\/$/, '').split('/');
        segments[segments.length - 1] = 'Logos';
        parsed.pathname = segments.join('/');
        return parsed.toString().replace(/\/$/, '');
      } catch {
        return url.replace(/\/[^/]*\/?$/, '/Logos');
      }
    });

    await serveFileWithFallback(
      localPath,
      relativePath,
      externalUrls,
      res,
      next,
      config.flashpointLogosPath
    );
  })
);

router.get(
  '/screenshots/:path(*)',
  asyncHandler(async (req, res, next) => {
    const relativePath = `Screenshots/${req.params.path}`;

    const localPath = validatePath(relativePath, config.flashpointImagesPath);

    if (!localPath) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          statusCode: 403,
        },
      });
    }

    const externalImageUrls = await getExternalImageUrls();

    await serveFileWithFallback(
      localPath,
      relativePath,
      externalImageUrls,
      res,
      next,
      config.flashpointImagesPath
    );
  })
);

export default router;
