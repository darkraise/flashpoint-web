import http from 'http';
import { logger } from './utils/logger';
import { ConfigManager } from './config';
import { ProxyRequestHandler } from './proxy-request-handler';

export interface ProxyServerOptions {
  proxyPort?: number;
  legacyHTDOCSPath: string;
  gameDataPath?: string;
  externalFilePaths?: string[];
  allowCrossDomain?: boolean;
  chunkSize?: number;
}

/**
 * Create and start the Flashpoint Proxy Server
 * This is the HTTP proxy implementation that replicates FlashpointGameServer
 */
export async function createHTTPProxyServer(options: ProxyServerOptions): Promise<http.Server> {
  // Load configuration
  const flashpointPath = options.legacyHTDOCSPath.replace(/[\\\/]Legacy[\\\/]htdocs.*$/, '');
  await ConfigManager.loadConfig(flashpointPath);

  const settings = ConfigManager.getSettings();

  // Override settings from options if provided
  if (options.proxyPort) {
    settings.proxyPort = options.proxyPort;
  }
  if (options.allowCrossDomain !== undefined) {
    settings.allowCrossDomain = options.allowCrossDomain;
  }
  if (options.chunkSize) {
    settings.chunkSize = options.chunkSize;
  }

  // Create request handler
  const requestHandler = new ProxyRequestHandler();

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    try {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        requestHandler.handleOptionsRequest(req, res);
        return;
      }

      // Handle proxy request
      await requestHandler.handleRequest(req, res);
    } catch (error) {
      logger.error('[HTTPProxyServer] Unhandled error:', error);

      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    }
  });

  // Configure server settings
  server.timeout = 120000; // 2 minutes timeout
  server.keepAliveTimeout = 65000; // 65 seconds keep-alive

  // Start listening
  await new Promise<void>((resolve, reject) => {
    server.listen(settings.proxyPort, () => {
      logger.info(`[HTTPProxyServer] ========================================`);
      logger.info(`[HTTPProxyServer] Flashpoint Proxy Server started`);
      logger.info(`[HTTPProxyServer] Port: ${settings.proxyPort}`);
      logger.info(`[HTTPProxyServer] HTDOCS: ${settings.legacyHTDOCSPath}`);
      logger.info(`[HTTPProxyServer] CGI-BIN: ${settings.legacyCGIBINPath}`);
      logger.info(`[HTTPProxyServer] External sources: ${settings.externalFilePaths.length}`);
      logger.info(`[HTTPProxyServer] ========================================`);
      resolve();
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`[HTTPProxyServer] Port ${settings.proxyPort} is already in use`);
        logger.error('[HTTPProxyServer] Please check if another instance is running');
      } else {
        logger.error('[HTTPProxyServer] Failed to start:', error);
      }
      reject(error);
    });
  });

  return server;
}

/**
 * Create and start the GameZip server
 * Serves files from mounted ZIP archives (port 22501)
 */
export async function createGameZipServer(): Promise<http.Server> {
  const { GameZipServer } = await import('./gamezipserver');
  const gameZipServer = new GameZipServer();
  return await gameZipServer.start();
}
