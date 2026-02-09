import { Router, Request, Response, json, NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';
import { gameZipServer } from '../game/gamezipserver';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { config } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';

const mountBodySchema = z.object({
  zipPath: z.string().min(1).max(500),
  gameId: z.string().optional(),
  dateAdded: z.string().optional(),
  sha256: z.string().optional(),
});

const router = Router();

// Restrictive CORS: only allow requests from the configured domain (admin routes)
const adminCors = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', config.domain);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
};

router.post(
  '/mount/:id',
  adminCors,
  authenticate,
  requirePermission('settings.update'),
  json(),
  asyncHandler(async (req: Request, res: Response) => {
    const bodyResult = mountBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid request body: ${bodyResult.error.issues[0].message}`,
      });
    }

    const { zipPath, gameId, dateAdded, sha256 } = bodyResult.data;

    const result = await gameZipServer.mountZip({
      id: req.params.id,
      zipPath,
      gameId,
      dateAdded,
      sha256,
    });
    res.status(result.statusCode).json(result);
  })
);

router.delete(
  '/mount/:id',
  adminCors,
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    const success = await gameZipServer.unmountZip(req.params.id);
    res.status(success ? 200 : 404).json({ success, id: req.params.id });
  })
);

router.get(
  '/mounts',
  adminCors,
  authenticate,
  requirePermission('settings.update'),
  (_req: Request, res: Response) => {
    res.json({ mounts: gameZipServer.listMounts() });
  }
);

// Handles proxy-style URLs like /game-zip/http://domain.com/path
router.get(
  '/*',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await gameZipServer.handleFileRequest(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse
      );
    } catch (error) {
      logger.error('[GameZip] File request error:', error);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  })
);

export default router;
