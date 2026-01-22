import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { softAuth } from './middleware/auth';
import { maintenanceMode } from './middleware/maintenanceMode';
import { setupRoutes } from './routes';
import { DatabaseService } from './services/DatabaseService';
import { UserDatabaseService } from './services/UserDatabaseService';
import { PlayTrackingService } from './services/PlayTrackingService';
import { JobScheduler } from './services/JobScheduler';
import { MetadataSyncJob } from './jobs/MetadataSyncJob';
import { CachedSystemSettingsService } from './services/CachedSystemSettingsService';
import { PermissionCache } from './services/PermissionCache';
import { RuffleService } from './services/RuffleService';

async function startServer() {
  const app: Express = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Will be configured in frontend
    crossOriginEmbedderPolicy: false
  }));

  // CORS
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true
  }));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

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
    const systemSettings = new CachedSystemSettingsService();
    const jobSettings = systemSettings.getCategory('jobs');

    // Register metadata sync job
    const metadataSyncJob = new MetadataSyncJob();
    JobScheduler.registerJob({
      id: 'metadata-sync',
      name: 'Metadata Sync',
      enabled: jobSettings.metadataSyncEnabled || false,
      cronSchedule: jobSettings.metadataSyncSchedule || '0 * * * *', // Default: hourly
      run: () => metadataSyncJob.run()
    });

    // Start all enabled jobs
    JobScheduler.startAllEnabledJobs();
    logger.info('✅ Job scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize job scheduler:', error);
    // Non-fatal error - continue server startup
  }

  // Note: Game proxy server functionality has been moved to game-service
  // The backend now proxies requests to game-service instead of serving them directly
  logger.info('📡 Game content will be proxied to game-service');
  logger.info(`   Proxy Server: ${config.gameServerUrl || 'http://localhost:22500'}`);
  logger.info(`   GameZip Server: http://localhost:${config.gameServerHttpPort}`);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      flashpointPath: config.flashpointPath,
      databaseConnected: DatabaseService.isConnected(),
      gameServiceUrl: config.gameServerUrl
    });
  });

  // API routes
  setupRoutes(app);

  // Error handling
  app.use(errorHandler);

  // Start permission cache cleanup
  PermissionCache.startCleanup();
  logger.info('✅ Permission cache initialized');

  // Start server
  const server = app.listen(config.port, config.host, () => {
    logger.info(`🚀 Flashpoint Web API server running on http://${config.host}:${config.port}`);
    logger.info(`📁 Flashpoint path: ${config.flashpointPath}`);
    logger.info(`🎮 Game Service: ${config.gameServerUrl || 'http://localhost:22500'}`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
  });

  // Start cleanup scheduler for abandoned play sessions (every 6 hours)
  const playTrackingService = new PlayTrackingService();
  const cleanupInterval = setInterval(() => {
    playTrackingService.cleanupAbandonedSessions().catch(error => {
      logger.error('Failed to cleanup abandoned sessions:', error);
    });
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Run initial cleanup
  playTrackingService.cleanupAbandonedSessions().catch(error => {
    logger.error('Failed to cleanup abandoned sessions:', error);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down gracefully...');

    // Stop permission cache cleanup
    PermissionCache.stopCleanup();

    // Stop play session cleanup
    clearInterval(cleanupInterval);

    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  JobScheduler.stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  JobScheduler.stopAllJobs();
  process.exit(0);
});

startServer();
// force restart
