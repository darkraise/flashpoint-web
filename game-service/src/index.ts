import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';
import { createHTTPProxyServer, createGameZipServer } from './http-proxy-server';

// Load environment variables
dotenv.config();

async function main() {
  try {
    logger.info('========================================');
    logger.info('🎮 Starting Flashpoint Game Service...');
    logger.info('========================================');

    // Get configuration from environment
    // Docker (production): /data/flashpoint (volume mount point)
    // Local dev: D:/Flashpoint or FLASHPOINT_PATH env var
    const flashpointPath =
      process.env.FLASHPOINT_PATH ||
      (process.env.NODE_ENV === 'production' ? '/data/flashpoint' : 'D:/Flashpoint');
    const flashpointHtdocsPath = path.join(flashpointPath, 'Legacy', 'htdocs');
    const flashpointGamesPath = path.join(flashpointPath, 'Data', 'Games');
    const proxyPort = parseInt(process.env.PROXY_PORT || '22500', 10);
    const gameZipPort = parseInt(process.env.GAMEZIPSERVER_PORT || '22501', 10);

    logger.info(`📁 Flashpoint path: ${flashpointPath}`);
    logger.info(`📂 HTDOCS path: ${flashpointHtdocsPath}`);
    logger.info(`🎮 Games path: ${flashpointGamesPath}`);
    logger.info('');

    // Start HTTP Proxy Server (port 22500)
    logger.info('Starting HTTP Proxy Server...');
    try {
      await createHTTPProxyServer({
        proxyPort,
        legacyHTDOCSPath: flashpointHtdocsPath,
        gameDataPath: flashpointGamesPath,
        allowCrossDomain: true,
        chunkSize: parseInt(process.env.PROXY_CHUNK_SIZE || '8192', 10),
      });
      logger.info(`✓ HTTP Proxy Server started on port ${proxyPort}`);
      logger.info('  Replicating FlashpointGameServer functionality');
      logger.info('');
    } catch (error) {
      logger.error('Failed to start HTTP Proxy Server:', error);
      throw error;
    }

    // Start GameZip Server (port 22501)
    logger.info('Starting GameZip Server...');
    try {
      await createGameZipServer();
      logger.info(`✓ GameZip Server started on port ${gameZipPort}`);
      logger.info('  Serving files from ZIP archives in Data/Games/');
      logger.info('');
    } catch (error) {
      logger.error('Failed to start GameZip Server:', error);
      logger.warn('Continuing without GameZip server - ZIP archive files will not be available');
      logger.info('');
    }

    logger.info('========================================');
    logger.info('✓ Flashpoint Game Service is ready!');
    logger.info('========================================');
    logger.info(`Proxy Server: http://localhost:${proxyPort}`);
    logger.info(`GameZip Server: http://localhost:${gameZipPort}`);
    logger.info('');
    logger.info('Press Ctrl+C to stop');
  } catch (error) {
    logger.error('Failed to start Flashpoint Game Service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('');
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('');
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

main();
