// IMPORTANT: OpenTelemetry must be imported FIRST for auto-instrumentation
import './telemetry';

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { logger, getLoggingStatus, verifyFileLogging } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { softAuth } from './middleware/auth';
import { maintenanceMode } from './middleware/maintenanceMode';
import { requestTimeout, TimeoutConfig } from './middleware/requestTimeout';
import { performanceTracking } from './middleware/performanceTracking';
import { setupRoutes } from './routes';
import { DatabaseService } from './services/DatabaseService';
import { UserDatabaseService } from './services/UserDatabaseService';
import { DomainService } from './services/DomainService';
import { PlayTrackingService } from './services/PlayTrackingService';
import { AuthService } from './services/AuthService';
import { GameSearchCache } from './services/GameSearchCache';
import { JobScheduler } from './services/JobScheduler';
import { MetadataSyncJob } from './jobs/MetadataSyncJob';
import { RuffleUpdateJob } from './jobs/RuffleUpdateJob';
import { CachedSystemSettingsService } from './services/CachedSystemSettingsService';
import { PermissionCache } from './services/PermissionCache';
import { RuffleService } from './services/RuffleService';
import { ConfigManager } from './game/config';
import { PreferencesService } from './game/services/PreferencesService';
import { zipManager } from './game/zip-manager';
import { gameZipServer } from './game/gamezipserver';
import gameProxyRouter from './routes/game-proxy';
import gameZipRouter from './routes/game-zip';

/**
 * Clean up old activity logs based on retention settings
 * Default retention: 30 days (from storage.log_retention_days setting)
 */
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

  // Trust proxy - Required for Docker/reverse proxy deployments
  // Enables Express to correctly read X-Forwarded-* headers from reverse proxies
  // Without this, req.ip returns the proxy IP instead of the client IP, causing all rate limiters to share a single counter
  app.set('trust proxy', 1);

  // --- Game content routes (BEFORE all middleware) ---
  // These bypass auth, maintenance mode, restrictive CORS, and body parsing.
  // Only a permissive CORS middleware is applied to game routes.
  const gameCors = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
  app.use('/game-proxy', gameCors, gameProxyRouter);
  app.use('/game-zip', gameCors, gameZipRouter);
  // --- End game content routes ---

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Will be configured in frontend via meta tag
      crossOriginEmbedderPolicy: false,
      frameguard: {
        action: 'deny', // Equivalent to frame-ancestors 'none'
      },
    })
  );

  const domainService = DomainService.getInstance();

  // CORS - dynamic origin to support configured domains
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin and server-to-server requests
        if (!origin) return callback(null, true);

        // Always allow the configured domain from env
        if (origin === config.domain) return callback(null, true);

        // Check domains from the database
        try {
          const allowed = domainService.getAllowedOrigins();
          if (allowed.has(origin)) return callback(null, true);
        } catch (error) {
          logger.warn(`[CORS] Failed to check domains for origin "${origin}":`, error);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Body parsing with size limits (prevent DoS attacks)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookie parsing
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // Request timeout (30 seconds default)
  // Prevents hanging requests from consuming resources
  app.use(requestTimeout(TimeoutConfig.DEFAULT));

  // Request logging
  app.use((req, res, next) => {
    // Skip logging for high-frequency paths
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

  // Performance tracking
  // Track response times for all endpoints
  app.use(performanceTracking);

  // Soft authentication - populates req.user if token exists (doesn't throw errors)
  // MUST be applied before maintenance mode check so it can identify admins
  app.use(softAuth);

  // Maintenance mode middleware - blocks non-admin users when enabled
  // Relies on req.user being populated by softAuth above
  app.use(maintenanceMode);

  // Initialize database
  try {
    await DatabaseService.initialize();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }

  // Initialize user database
  try {
    await UserDatabaseService.initialize();
    logger.info('User database connection established');
  } catch (error) {
    logger.error('Failed to connect to user database:', error);
    process.exit(1);
  }

  // Log auto-detected Flashpoint edition and version
  // Edition is detected from {FLASHPOINT_PATH}/version.txt on startup (see config.ts)
  logger.info(`[Edition] Flashpoint edition: ${config.flashpointEdition} (auto-detected)`);
  if (config.flashpointVersionString) {
    logger.info(`[Edition] Flashpoint version: ${config.flashpointVersionString}`);
  }

  // Pre-warm game search cache for instant first page load
  // Run asynchronously to not block server startup
  GameSearchCache.prewarmCache().catch((error) => {
    logger.warn('Failed to pre-warm game search cache:', error);
    // Non-fatal: server continues without pre-warmed cache
  });

  // Check if Ruffle is installed, download if not
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
    // Non-fatal error - continue server startup
  }

  // Initialize job scheduler
  try {
    const systemSettings = CachedSystemSettingsService.getInstance();
    const jobSettings = systemSettings.getCategory('jobs');

    // Register metadata sync job
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
          : '0 * * * *', // Default: hourly
      run: () => metadataSyncJob.run(),
    });

    // Register Ruffle update job
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
          : '0 0 * * *', // Default: daily at midnight
      run: () => ruffleUpdateJob.run(),
    });

    // Start all enabled jobs
    JobScheduler.startAllEnabledJobs();
    logger.info('✅ Job scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize job scheduler:', error);
    // Non-fatal error - continue server startup
  }

  // Initialize game service configuration (integrated into backend)
  try {
    await ConfigManager.loadConfig(config.flashpointPath);
    PreferencesService.initialize(config.flashpointPath);
    logger.info('🎮 Game service configuration loaded (integrated)');
  } catch (error) {
    logger.warn('⚠️  Failed to load game service config (non-fatal):', error);
  }

  // Health check - game service is now integrated (no external dependency)
  // NOTE: This endpoint is registered before middleware for load balancer access.
  // It performs basic health checks. For detailed health status, use /api/health (requires auth).
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

  // API routes
  setupRoutes(app);

  // Error handling
  app.use(errorHandler);

  // Start permission cache cleanup
  PermissionCache.startCleanup();
  logger.info('✅ Permission cache initialized');

  // Log logging system status
  const loggingStatus = getLoggingStatus();
  logger.info('Logging system status', loggingStatus);
  if (loggingStatus.fileEnabled) {
    // Verify file logging works after a short delay to allow winston to initialize
    setTimeout(() => {
      if (verifyFileLogging()) {
        logger.info('File logging verified successfully');
      } else {
        logger.warn('File logging verification failed - check permissions');
      }
    }, 1000);
  } else if (loggingStatus.fileError) {
    logger.warn(`File logging unavailable: ${loggingStatus.fileError}`);
  }

  // Start server
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
  // Note: Connection limiting is handled by the reverse proxy (nginx)

  // Start cleanup scheduler for abandoned play sessions (every 6 hours)
  const playTrackingService = new PlayTrackingService();
  const playSessionCleanupInterval = setInterval(
    () => {
      playTrackingService.cleanupAbandonedSessions().catch((error) => {
        logger.error('Failed to cleanup abandoned sessions:', error);
      });
    },
    6 * 60 * 60 * 1000
  ); // 6 hours
  playSessionCleanupInterval.unref();

  // Run initial play session cleanup
  playTrackingService.cleanupAbandonedSessions().catch((error) => {
    logger.error('Failed to cleanup abandoned sessions:', error);
  });

  // Start cleanup scheduler for old login attempts (every 6 hours)
  const authService = new AuthService();
  const loginAttemptsCleanupInterval = setInterval(
    () => {
      authService.cleanupOldLoginAttempts().catch((error) => {
        logger.error('Failed to cleanup old login attempts:', error);
      });
    },
    6 * 60 * 60 * 1000
  ); // 6 hours
  loginAttemptsCleanupInterval.unref();

  // Run initial login attempts cleanup
  authService.cleanupOldLoginAttempts().catch((error) => {
    logger.error('Failed to cleanup old login attempts:', error);
  });

  // Start cleanup scheduler for old activity logs (daily)
  const activityLogsCleanupInterval = setInterval(
    () => {
      cleanupActivityLogs().catch((error) => {
        logger.error('Failed to cleanup old activity logs:', error);
      });
    },
    24 * 60 * 60 * 1000
  ); // 24 hours
  activityLogsCleanupInterval.unref();

  // Run initial activity logs cleanup
  cleanupActivityLogs().catch((error) => {
    logger.error('Failed to cleanup old activity logs:', error);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    // Stop scheduled jobs
    JobScheduler.stopAllJobs();

    // Stop permission cache cleanup
    PermissionCache.stopCleanup();

    // Stop cleanup intervals
    clearInterval(playSessionCleanupInterval);
    clearInterval(loginAttemptsCleanupInterval);
    clearInterval(activityLogsCleanupInterval);

    // Dispose game zip server (stops download cleanup interval)
    try {
      gameZipServer.dispose();
    } catch (err) {
      logger.error('Failed to dispose game zip server during shutdown:', err);
    }

    // Clean up mounted ZIPs (await to release file handles)
    try {
      await zipManager.unmountAll();
    } catch (err) {
      logger.error('Failed to unmount ZIPs during shutdown:', err);
    }

    // Close database connections
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

    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

startServer();
