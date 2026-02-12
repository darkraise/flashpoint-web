import { Router, Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { ProxyRequestHandler } from '../game/proxy-request-handler';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

let proxyHandler: ProxyRequestHandler | null = null;

function getHandler(): ProxyRequestHandler {
  if (!proxyHandler) {
    proxyHandler = new ProxyRequestHandler();
  }
  return proxyHandler;
}

// Express strips the mount path, so req.url is everything after /game-proxy
router.all(
  '/*',
  asyncHandler(async (req: Request, res: Response) => {
    const handler = getHandler();

    if (req.method === 'OPTIONS') {
      // Double cast: Express.Request doesn't directly extend IncomingMessage
      handler.handleOptionsRequest(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse
      );
      return;
    }

    // Double cast: Express.Request doesn't directly extend IncomingMessage
    await handler.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse
    );
  })
);

export default router;
