import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';
import { DatabaseService } from './services/DatabaseService';
import { UserDatabaseService } from './services/UserDatabaseService';
import { PlayTrackingService } from './services/PlayTrackingService';

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

  // Start server
  app.listen(config.port, config.host, () => {
    logger.info(`🚀 Flashpoint Web API server running on http://${config.host}:${config.port}`);
    logger.info(`📁 Flashpoint path: ${config.flashpointPath}`);
    logger.info(`🎮 Game Service: ${config.gameServerUrl || 'http://localhost:22500'}`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
  });

  // Start cleanup scheduler for abandoned play sessions (every 6 hours)
  const playTrackingService = new PlayTrackingService();
  setInterval(() => {
    playTrackingService.cleanupAbandonedSessions().catch(error => {
      logger.error('Failed to cleanup abandoned sessions:', error);
    });
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Run initial cleanup
  playTrackingService.cleanupAbandonedSessions().catch(error => {
    logger.error('Failed to cleanup abandoned sessions:', error);
  });
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
// force restart
