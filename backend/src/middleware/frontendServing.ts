import express, { Express } from 'express';
import type { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';
import { startupGate } from './startupGate';

/**
 * Ruffle content-hashes its chunks (`core.ruffle.4ca82b563e9711217164.js`,
 * `f2a570ccf4468b20d95a.wasm`) but not its entry points. Detecting the hash
 * rather than listing the stable names keeps this correct when a release adds a
 * file.
 */
const HASHED_RUFFLE_ASSET = /[0-9a-f]{16,}/i;

/**
 * `ruffle.js` keeps its name across versions, so serving it immutable pinned
 * every returning browser to the loader it first saw — an update reached the
 * disk and nothing else.
 */
function setRuffleCacheControl(res: Response, filePath: string): void {
  res.setHeader(
    'Cache-Control',
    HASHED_RUFFLE_ASSET.test(path.basename(filePath))
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate'
  );
}

/**
 * Single-image deployment: the backend serves the built frontend and its SPA
 * fallback.
 *
 * Registered before auth/maintenance so the app shell always loads (the SPA then
 * reflects login/maintenance state from API responses), and before the API
 * catch-all 404 in setupRoutes so client routes reach index.html.
 *
 * It must also stay ahead of the startup gate: nothing here needs the database,
 * and serving the shell during startup is what lets the SPA render its "server
 * is starting" screen instead of the browser showing a connection error.
 */
export function registerFrontendServing(app: Express, distPath = config.frontendDistPath): void {
  const indexHtml = path.join(distPath, 'index.html');
  const bundledRufflePath = path.join(distPath, 'ruffle');

  if (!fs.existsSync(indexHtml)) {
    logger.warn(
      `⚠️  SERVE_FRONTEND is enabled but no build was found at ${indexHtml} — skipping static serving`
    );
    return;
  }

  // Ahead of the dist handler so an updated Ruffle shadows the one baked into
  // the image. `fallthrough` lets the baked copy answer for anything the
  // persisted directory is missing, including before the first seed finishes.
  app.use(
    '/ruffle',
    express.static(config.ruffleDataPath, {
      index: false,
      fallthrough: true,
      setHeaders: setRuffleCacheControl,
    })
  );

  app.use(
    express.static(distPath, {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // Hashed assets are immutable; index.html must always be revalidated.
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return;
        }
        if (filePath.startsWith(bundledRufflePath + path.sep)) {
          setRuffleCacheControl(res, filePath);
        }
      },
    })
  );

  const backendPrefixes = ['/api/', '/game-proxy/', '/game-zip/', '/proxy/'];
  app.get('*', (req, res, next) => {
    if (req.path === '/health' || backendPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexHtml);
  });

  logger.info(`🖥️  Serving frontend from ${distPath}`);
}

/**
 * Registers everything that must be in place before the listener opens, in the
 * one order that works: the SPA shell first so it loads during startup, then the
 * gate that holds back every route needing the database.
 *
 * Exported as a unit so the ordering is exercised by tests rather than restated
 * in them — a test that mirrors this order proves its own wiring, not the
 * server's.
 */
export function registerPreListenStack(app: Express, distPath = config.frontendDistPath): void {
  if (config.serveFrontend) {
    registerFrontendServing(app, distPath);
  }

  app.use(startupGate);
}
