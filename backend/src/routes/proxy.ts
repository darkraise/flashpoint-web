import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import axios from 'axios';

const router = Router();

/**
 * Helper function to serve file with external CDN fallback
 */
async function serveFileWithFallback(
  localPath: string,
  relativePath: string,
  externalBaseUrls: string[],
  res: any,
  next: any
) {
  try {
    // Try local file first
    if (fs.existsSync(localPath)) {
      logger.debug(`[Proxy] Serving local file: ${localPath}`);
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
          validateStatus: (status) => status === 200
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
              logger.warn(`[Proxy] Failed to cache image locally: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`);
            }
          })();

          // Set appropriate content type
          const contentType = response.headers['content-type'] || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

          return res.send(imageBuffer);
        }
      } catch (err) {
        logger.debug(`[Proxy] Failed to fetch from ${baseUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Continue to next URL
      }
    }

    // If all attempts failed, return 404
    logger.warn(`[Proxy] Image not found locally or on CDN: ${relativePath}`);
    res.status(404).json({
      error: {
        message: 'Image not found',
        statusCode: 404
      }
    });
  } catch (error) {
    next(error);
  }
}

// Proxy to Flashpoint Game Server for game content
router.use('/game', createProxyMiddleware({
  target: config.gameServerUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/proxy/game': '' // Remove /proxy/game prefix
  },
  onProxyReq: (proxyReq, req, _res) => {
    // Add headers if needed
    if (req.ip) {
      proxyReq.setHeader('X-Forwarded-For', req.ip);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({
      error: {
        message: 'Failed to proxy request to game server',
        statusCode: 500
      }
    });
  }
}));

// Serve images with CDN fallback
router.get('/images/:path(*)', async (req, res, next) => {
  const relativePath = req.params.path;
  const localPath = path.join(config.flashpointImagesPath, relativePath);

  await serveFileWithFallback(
    localPath,
    relativePath,
    config.externalImageUrls,
    res,
    next
  );
});

// Serve logos with CDN fallback
router.get('/logos/:path(*)', async (req, res, next) => {
  const relativePath = req.params.path;
  const localPath = path.join(config.flashpointLogosPath, relativePath);

  // For logos, the external path should include 'Logos' subdirectory
  const externalUrls = config.externalImageUrls.map(url => `${url}/../Logos`);

  await serveFileWithFallback(
    localPath,
    relativePath,
    externalUrls,
    res,
    next
  );
});

// Serve screenshots with CDN fallback
router.get('/screenshots/:path(*)', async (req, res, next) => {
  const relativePath = `Screenshots/${req.params.path}`;
  const localPath = path.join(config.flashpointImagesPath, relativePath);

  await serveFileWithFallback(
    localPath,
    relativePath,
    config.externalImageUrls,
    res,
    next
  );
});

export default router;
