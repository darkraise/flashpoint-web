import { Router, Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { ProxyRequestHandler } from '../game/proxy-request-handler';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

let proxyHandler: ProxyRequestHandler | null = null;

function getHandler(): ProxyRequestHandler {
  if (!proxyHandler) {
    proxyHandler = new ProxyRequestHandler();
  }
  return proxyHandler;
}

// Handle all game content requests: /game-proxy/*
// Express strips the mount path, so req.url is everything after /game-proxy
// e.g., /game-proxy/http://domain.com/file.swf → req.url = /http://domain.com/file.swf
router.all(
  '/*',
  asyncHandler(async (req: Request, res: Response) => {
    const handler = getHandler();

    // OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      // Cast Express types to Node HTTP types for compatibility
      // Double cast needed: Express.Request doesn't directly extend IncomingMessage
      handler.handleOptionsRequest(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse
      );
      return;
    }

    // Delegate to ProxyRequestHandler
    // Double cast needed: Express.Request doesn't directly extend IncomingMessage
    await handler.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse
    );
  })
);

export default router;
