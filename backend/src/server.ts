// IMPORTANT: OpenTelemetry must be imported FIRST for auto-instrumentation
import './telemetry';

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { logger, getLoggingStatus, verifyFileLogging } from './utils/logger';
import { isOriginAllowed } from './utils/origins';
import { errorHandler } from './middleware/errorHandler';
import { softAuth } from './middleware/auth';
import { maintenanceMode } from './middleware/maintenanceMode';
import { requestTimeout, TimeoutConfig } from './middleware/requestTimeout';
import { performanceTracking } from './middleware/performanceTracking';
import { setupRoutes } from './routes';
import { DatabaseService } from './services/DatabaseService';
import { DbQueryPool } from './services/DbQueryPool';
import { DownloadedReconciler } from './services/DownloadedReconciler';
import { UserDatabaseService } from './services/UserDatabaseService';
import { DomainService } from './services/DomainService';
import { PlayTrackingService } from './services/PlayTrackingService';
import { AuthService } from './services/AuthService';
import { GameSearchCache } from './services/GameSearchCache';
import { GameService } from './services/GameService';
import { JobScheduler } from './services/JobScheduler';
import { JobExecutionService } from './services/JobExecutionService';
import { MetadataSyncJob } from './jobs/MetadataSyncJob';
import { RuffleUpdateJob } from './jobs/RuffleUpdateJob';
import { CachedSystemSettingsService } from './services/CachedSystemSettingsService';
import { PermissionCache } from './services/PermissionCache';
import { PerformanceMetrics } from './services/PerformanceMetrics';
import { RuffleService } from './services/RuffleService';
import { ConfigManager } from './game/config';
import { zipManager } from './game/zip-manager';
import { gameZipServer } from './game/gamezipserver';
import gameProxyRouter from './routes/game-proxy';
import gameZipRouter from './routes/game-zip';

/**
 * Compute SHA-256 CSP hashes for inline <script> blocks (those without a src
 * attribute) in the given HTML — e.g. the theme bootstrap in index.html — so the
 * CSP can allow exactly those scripts by hash instead of the blanket
 * 'unsafe-inline'. Returns values like "'sha256-…'".
 */
function inlineScriptCspHashes(html: string): string[] {
  const hashes: string[] = [];
  const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = inlineScript.exec(html)) !== null) {
    // The HTML parser normalizes CRLF/CR to LF before hashing the script text,
    // so normalize here too or the hash won't match on CRLF-checked-out builds.
    const body = match[1].replace(/\r\n?/g, '\n');
    const digest = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.push(`'sha256-${digest}'`);
  }
  return hashes;
}

async function cleanupActivityLogs(): Promise<void> {
  try {
    const systemSettings = CachedSystemSettingsService.getInstance();
    const storageSettings = systemSettings.getCategory('storage');
    const retentionDays =
      typeof storageSettings.logRetentionDays === 'number' ? storageSettings.logRetentionDays : 30;

    const result = UserDatabaseService.run(
      `DELETE FROM activity_logs
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [retentionDays]
    );

    if (result.changes > 0) {
      logger.info(
        `[ActivityLogs] Cleaned up ${result.changes} logs older than ${retentionDays} days`
      );
    }
  } catch (error) {
    logger.error('[ActivityLogs] Failed to cleanup old activity logs:', error);
    throw error;
  }
}

async function startServer() {
  const app: Express = express();

  // Without trust proxy, req.ip returns the proxy IP, causing rate limiters to share a single counter
  app.set('trust proxy', 1);

  // Game content routes registered BEFORE auth/maintenance middleware (need cross-origin access)
  const gameCors = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    // Required for iframe embedding when parent has COEP enabled
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
  app.use('/game-proxy', gameCors, gameProxyRouter);
  app.use('/game-zip', gameCors, gameZipRouter);

  // When the backend also serves the SPA, allow the app's own resources by
  // hash/keyword rather than the blanket 'unsafe-inline'/'unsafe-eval':
  //   - scriptSrc: 'self' for hashed bundles, sha256 hashes for the inline theme
  //     bootstrap in index.html, and 'wasm-unsafe-eval' for Ruffle's WASM (no
  //     general eval). No 'unsafe-inline', so injected inline scripts are blocked.
  //   - styleSrc: keep 'unsafe-inline' — Radix/shadcn set inline style attributes
  //     at runtime, which hashes/nonces cannot cover (style-src-attr). Style
  //     injection is far lower risk than script injection.
  // No upgrade-insecure-requests, so self-hosted HTTP deployments keep working.
  // When running API-only, keep the strict 'none' policy.
  const frontendIndexHtml = path.join(config.frontendDistPath, 'index.html');
  const inlineScriptHashes =
    config.serveFrontend && fs.existsSync(frontendIndexHtml)
      ? inlineScriptCspHashes(fs.readFileSync(frontendIndexHtml, 'utf8'))
      : [];
  const cspDirectives: Record<string, string[]> = config.serveFrontend
    ? {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", ...inlineScriptHashes],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      }
    : {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      };

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: !config.serveFrontend,
        directives: cspDirectives,
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
    })
  );

  const domainService = DomainService.getInstance();

  app.use(
    cors((req, callback) => {
      const origin = req.headers.origin;

      let domainOrigins: ReadonlySet<string> = new Set<string>();
      try {
        domainOrigins = domainService.getAllowedOrigins();
      } catch (error) {
        logger.warn(`[CORS] Failed to load domains for origin "${origin ?? ''}":`, error);
      }

      const allowed = isOriginAllowed({
        origin,
        host: req.headers.host,
        configuredOrigins: config.allowedOrigins,
        domainOrigins,
      });

      if (!allowed) {
        logger.warn(
          `[CORS] Rejected origin "${origin ?? ''}" (host "${req.headers.host ?? ''}"). ` +
            `Allowed: ${config.allowedOrigins.join(', ') || 'none'}`
        );
      }

      // origin: true reflects the request's own origin, which is required for
      // credentialed requests — a wildcard is not permitted with cookies.
      callback(null, { origin: allowed, credentials: true });
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(cookieParser());
  app.use(compression());

  // Single-image deployment: the backend serves the built frontend and its SPA
  // fallback. Registered before auth/maintenance so the app shell always loads
  // (the SPA then reflects login/maintenance state from API responses), and
  // before the API catch-all 404 in setupRoutes so client routes reach index.html.
  if (config.serveFrontend) {
    const distPath = config.frontendDistPath;
    const indexHtml = path.join(distPath, 'index.html');

    if (fs.existsSync(indexHtml)) {
      app.use(
        express.static(distPath, {
          index: false,
          maxAge: '1y',
          immutable: true,
          setHeaders: (res, filePath) => {
            // Hashed assets are immutable; index.html must always be revalidated.
            if (filePath.endsWith('index.html')) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
          },
        })
      );

      const backendPrefixes = ['/api/', '/game-proxy/', '/game-zip/', '/proxy/'];
      app.get('*', (req, res, next) => {
        if (
          req.path === '/health' ||
          backendPrefixes.some((prefix) => req.path.startsWith(prefix))
        ) {
          next();
          return;
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(indexHtml);
      });

      logger.info(`🖥️  Serving frontend from ${distPath}`);
    } else {
      logger.warn(
        `⚠️  SERVE_FRONTEND is enabled but no build was found at ${indexHtml} — skipping static serving`
      );
    }
  }

  app.use(requestTimeout(TimeoutConfig.DEFAULT));

  app.use((req, res, next) => {
    if (
      req.path === '/health' ||
      req.path.startsWith('/game-proxy/') ||
      req.path.startsWith('/game-zip/')
    ) {
      next();
      return;
    }
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  app.use(performanceTracking);

  // softAuth MUST run before maintenanceMode so it can identify admins
  app.use(softAuth);
  app.use(maintenanceMode);

  try {
    await DatabaseService.initialize();
    logger.info('Database connection established');
    DownloadedReconciler.reconcile().catch((error: unknown) =>
      logger.error('[Startup] Downloaded reconciliation failed:', error)
    );
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }

  try {
    await UserDatabaseService.initialize();
    logger.info('User database connection established');
  } catch (error) {
    logger.error('Failed to connect to user database:', error);
    process.exit(1);
  }

  logger.info(`[Edition] Flashpoint edition: ${config.flashpointEdition} (auto-detected)`);
  if (config.flashpointVersionString) {
    logger.info(`[Edition] Flashpoint version: ${config.flashpointVersionString}`);
  }

  GameSearchCache.prewarmCache().catch((error) => {
    logger.warn('Failed to pre-warm game search cache:', error);
  });

  GameService.prewarmFilterOptions().catch((error) => {
    logger.warn('Failed to pre-warm filter options cache:', error);
  });

  // Ruffle installs in the background: it downloads from GitHub, and awaiting it
  // here kept the port closed for minutes on slow storage — indefinitely if the
  // download stalled. Flash games need it, everything else does not.
  void (async () => {
    try {
      const ruffleService = new RuffleService();
      if (!ruffleService.verifyInstallation()) {
        logger.info('🎮 Ruffle not found, downloading latest version...');
        await ruffleService.updateRuffle();
        logger.info('✅ Ruffle installation complete');
      } else {
        const version = ruffleService.getCurrentVersion();
        logger.info(`✅ Ruffle verified (version: ${version || 'unknown'})`);
      }
    } catch (error) {
      logger.error('Failed to install Ruffle:', error);
      logger.warn('⚠️  Continuing without Ruffle - Flash games will not work');
    }
  })();

  try {
    const systemSettings = CachedSystemSettingsService.getInstance();
    const jobSettings = systemSettings.getCategory('jobs');

    const metadataSyncJob = new MetadataSyncJob();
    JobScheduler.registerJob({
      id: 'metadata-sync',
      name: 'Metadata Sync',
      enabled:
        typeof jobSettings.metadataSyncEnabled === 'boolean'
          ? jobSettings.metadataSyncEnabled
          : false,
      cronSchedule:
        typeof jobSettings.metadataSyncSchedule === 'string'
          ? jobSettings.metadataSyncSchedule
          : '0 * * * *',
      run: () => metadataSyncJob.run(),
    });

    const ruffleUpdateJob = new RuffleUpdateJob();
    JobScheduler.registerJob({
      id: 'ruffle-update',
      name: 'Ruffle Update',
      enabled:
        typeof jobSettings.ruffleUpdateEnabled === 'boolean'
          ? jobSettings.ruffleUpdateEnabled
          : false,
      cronSchedule:
        typeof jobSettings.ruffleUpdateSchedule === 'string'
          ? jobSettings.ruffleUpdateSchedule
          : '0 0 * * *',
      run: () => ruffleUpdateJob.run(),
    });

    JobScheduler.startAllEnabledJobs();
    logger.info('✅ Job scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize job scheduler:', error);
  }

  try {
    await ConfigManager.loadConfig(config.flashpointPath);
    logger.info('🎮 Game service configuration loaded (integrated)');
  } catch (error) {
    logger.warn('⚠️  Failed to load game service config (non-fatal):', error);
  }

  app.get('/health', async (_req, res) => {
    const isHealthy = DatabaseService.isConnected();

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: DatabaseService.isConnected() ? 'ok' : 'error',
        },
        gameService: {
          status: 'ok',
          note: 'integrated',
        },
      },
    });
  });

  setupRoutes(app);
  app.use(errorHandler);

  PermissionCache.startCleanup();
  logger.info('✅ Permission cache initialized');

  const loggingStatus = getLoggingStatus();
  logger.info('Logging system status', loggingStatus);
  if (loggingStatus.fileEnabled) {
    setTimeout(() => {
      if (verifyFileLogging()) {
        logger.info('File logging verified successfully');
      } else {
        logger.warn('File logging verification failed - check permissions');
      }
    }, 1000).unref();
  } else if (loggingStatus.fileError) {
    logger.warn(`File logging unavailable: ${loggingStatus.fileError}`);
  }

  const server = app.listen(config.port, config.host, () => {
    logger.info(`🚀 Flashpoint Web API server running on http://${config.host}:${config.port}`);
    logger.info(`📁 Flashpoint path: ${config.flashpointPath}`);
    logger.info(`🎮 Game content: /game-proxy/* and /game-zip/* (integrated)`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
  });

  // Prevent connection exhaustion - critical for handling game file requests
  server.keepAliveTimeout = 65000; // 65s - slightly above common load balancer timeout
  server.headersTimeout = 66000; // Must be > keepAliveTimeout
  server.timeout = 120000; // 2 min max for any request (including game file streaming)
  server.maxConnections = 500; // Defense-in-depth against connection exhaustion

  const playTrackingService = new PlayTrackingService();
  const playSessionCleanupInterval = setInterval(
    () => {
      playTrackingService.cleanupAbandonedSessions().catch((error) => {
        logger.error('Failed to cleanup abandoned sessions:', error);
      });
    },
    6 * 60 * 60 * 1000
  );
  playSessionCleanupInterval.unref();

  playTrackingService.cleanupAbandonedSessions().catch((error) => {
    logger.error('Failed to cleanup abandoned sessions:', error);
  });

  const authService = new AuthService();
  const loginAttemptsCleanupInterval = setInterval(
    () => {
      authService.cleanupOldLoginAttempts().catch((error) => {
        logger.error('Failed to cleanup old login attempts:', error);
      });
    },
    6 * 60 * 60 * 1000
  );
  loginAttemptsCleanupInterval.unref();

  authService.cleanupOldLoginAttempts().catch((error) => {
    logger.error('Failed to cleanup old login attempts:', error);
  });

  const activityLogsCleanupInterval = setInterval(
    () => {
      cleanupActivityLogs().catch((error) => {
        logger.error('Failed to cleanup old activity logs:', error);
      });
    },
    24 * 60 * 60 * 1000
  );
  activityLogsCleanupInterval.unref();

  cleanupActivityLogs().catch((error) => {
    logger.error('Failed to cleanup old activity logs:', error);
  });

  // Cleanup old performance metrics every hour
  const metricsCleanupInterval = setInterval(
    () => {
      PerformanceMetrics.cleanupOldMetrics();
    },
    60 * 60 * 1000
  );
  metricsCleanupInterval.unref();

  const jobExecutionService = new JobExecutionService();
  const jobLogCleanupInterval = setInterval(
    () => {
      try {
        jobExecutionService.cleanupOldLogs(30);
      } catch (error) {
        logger.error('Failed to cleanup old job execution logs:', error);
      }
    },
    24 * 60 * 60 * 1000
  );
  jobLogCleanupInterval.unref();

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    JobScheduler.stopAllJobs();
    PermissionCache.stopCleanup();
    clearInterval(playSessionCleanupInterval);
    clearInterval(loginAttemptsCleanupInterval);
    clearInterval(activityLogsCleanupInterval);
    clearInterval(jobLogCleanupInterval);
    clearInterval(metricsCleanupInterval);

    try {
      gameZipServer.dispose();
    } catch (err) {
      logger.error('Failed to dispose game zip server during shutdown:', err);
    }

    try {
      await zipManager.unmountAll();
    } catch (err) {
      logger.error('Failed to unmount ZIPs during shutdown:', err);
    }

    try {
      await DbQueryPool.shutdown();
    } catch (err) {
      logger.error('Failed to stop database query workers during shutdown:', err);
    }

    try {
      DatabaseService.close();
    } catch (err) {
      logger.error('Failed to close database during shutdown:', err);
    }
    try {
      UserDatabaseService.close();
    } catch (err) {
      logger.error('Failed to close user database during shutdown:', err);
    }

    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

startServer();
