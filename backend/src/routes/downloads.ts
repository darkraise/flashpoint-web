import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DownloadManager } from '../services/DownloadManager';
import { PreferencesService } from '../services/PreferencesService';
import { GameDatabaseUpdater } from '../services/GameDatabaseUpdater';
import { GameService } from '../services/GameService';
import { ActivityService } from '../services/ActivityService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';
import { DownloadRegistry } from '../services/DownloadRegistry';

const downloadBodySchema = z.object({
  gameDataId: z.number().int().positive().optional(),
});

const router = Router();
const gameService = new GameService();
const activityService = new ActivityService();

router.post(
  '/:id/download',
  authenticate,
  requirePermission('games.download'),
  logActivity('games.download', 'games', (req, res) => ({
    gameId: req.params.id,
    gameDataId: req.body.gameDataId || res.locals.gameDataId,
    gameTitle: res.locals.gameTitle,
    sources: res.locals.sources,
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;

    const bodyResult = downloadBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid request body: ${bodyResult.error.issues[0].message}`,
      });
    }

    const { gameDataId: requestedGameDataId } = bodyResult.data;

    logger.info('Download request received', { gameId, requestedGameDataId });

    const game = await gameService.getGameById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    let gameDataId = requestedGameDataId;
    if (!gameDataId) {
      const foundGameDataId = await gameService.getGameDataId(gameId);
      if (!foundGameDataId) {
        return res.status(404).json({
          success: false,
          error: 'Game has no game data to download',
        });
      }
      gameDataId = foundGameDataId;
    }

    const isDownloaded = await GameDatabaseUpdater.isDownloaded(gameDataId);
    if (isDownloaded) {
      return res.status(409).json({
        success: false,
        error: 'Game data already downloaded',
      });
    }

    const gameData = await GameDatabaseUpdater.getGameData(gameDataId);
    if (!gameData) {
      return res.status(404).json({
        success: false,
        error: 'Game data not found',
      });
    }

    const sources = await PreferencesService.getGameDataSources();
    if (sources.length === 0) {
      return res.status(500).json({
        success: false,
        error:
          'No game data sources configured. Please configure gameDataSources in preferences.json',
      });
    }

    res.locals.gameDataId = gameDataId;
    res.locals.gameTitle = game.title;
    res.locals.sources = sources.map((s) => s.name);

    const downloadMetadata = {
      gameId,
      gameDataId,
      gameTitle: game.title,
      sha256: gameData.sha256,
      sources: sources.map((s) => s.name),
      userId: req.user?.id,
      username: req.user?.username,
      ipAddress: req.ip,
    };

    // Non-blocking: client uses SSE endpoint for progress
    DownloadManager.downloadGameData(gameDataId, sources, undefined, undefined, undefined).catch(
      async (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Background download failed', {
          gameId,
          gameDataId,
          error: errorMessage,
        });

        await activityService.log({
          userId: downloadMetadata.userId,
          username: downloadMetadata.username,
          action: 'games.download.failed',
          resource: 'games',
          resourceId: downloadMetadata.gameId,
          details: {
            gameDataId: downloadMetadata.gameDataId,
            gameTitle: downloadMetadata.gameTitle,
            sha256: downloadMetadata.sha256,
            sources: downloadMetadata.sources,
            error: errorMessage,
          },
          ipAddress: downloadMetadata.ipAddress,
          userAgent: req.get('user-agent'),
        });
      }
    );

    res.json({
      success: true,
      message: 'Download started',
      gameDataId,
      sha256: gameData.sha256,
    });
  })
);

router.get(
  '/:id/download/progress',
  authenticate,
  requirePermission('games.download'),
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    logger.info('SSE connection established', { gameId });

    const game = await gameService.getGameById(gameId);
    if (!game) {
      res.write(
        `data: ${JSON.stringify({
          status: 'error',
          error: 'Game not found',
        })}\n\n`
      );
      res.end();
      return;
    }

    const gameDataId = await gameService.getGameDataId(gameId);
    if (!gameDataId) {
      res.write(
        `data: ${JSON.stringify({
          status: 'error',
          error: 'Game has no game data',
        })}\n\n`
      );
      res.end();
      return;
    }

    res.write(
      `data: ${JSON.stringify({
        percent: 0,
        status: 'waiting',
        details: 'Preparing download...',
      })}\n\n`
    );

    // Note: This is a simplified implementation. In production, you'd want
    // a proper event emitter system to push updates rather than polling.
    let closed = false;

    const pollInterval = setInterval(async () => {
      if (closed) return;

      try {
        // Check both DownloadManager and shared registry (for GameZipServer downloads)
        const isActive =
          DownloadManager.isDownloadActive(gameDataId) ||
          DownloadRegistry.isActiveByDataId(gameDataId);

        if (closed) return; // Re-check after await

        if (!isActive) {
          const isDownloaded = await GameDatabaseUpdater.isDownloaded(gameDataId);

          if (closed) return; // Re-check after await

          if (isDownloaded) {
            if (!closed) {
              res.write(
                `data: ${JSON.stringify({
                  percent: 100,
                  status: 'complete',
                  details: 'Download completed successfully',
                })}\n\n`
              );
            }

            const gameData = await GameDatabaseUpdater.getGameData(gameDataId);

            if (closed) return; // Re-check after await

            await activityService.log({
              userId: req.user?.id,
              username: req.user?.username,
              action: 'games.download.complete',
              resource: 'games',
              resourceId: gameId,
              details: {
                gameDataId,
                gameTitle: game.title,
                sha256: gameData?.sha256,
              },
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            });
          } else {
            if (!closed) {
              res.write(
                `data: ${JSON.stringify({
                  percent: 0,
                  status: 'error',
                  details: 'Download not active',
                })}\n\n`
              );
            }
          }

          clearInterval(pollInterval);
          if (!closed) {
            res.end();
          }
        } else {
          if (!closed) {
            res.write(
              `data: ${JSON.stringify({
                percent: 0,
                status: 'downloading',
                details: 'Download in progress...',
              })}\n\n`
            );
          }
        }
      } catch (error) {
        if (!closed) {
          logger.error('Error in SSE poll', { error });
        }
        clearInterval(pollInterval);
        if (!closed) {
          res.end();
        }
      }
    }, 1000);

    req.on('close', () => {
      closed = true;
      logger.info('SSE connection closed', { gameId });
      clearInterval(pollInterval);
    });
  })
);

router.delete(
  '/:id/download',
  authenticate,
  requirePermission('games.download'),
  logActivity('games.download_cancel', 'games'),
  asyncHandler(async (req: Request, res: Response) => {
    const gameId = req.params.id;

    logger.info('Download cancel request', { gameId });

    const game = await gameService.getGameById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    const gameDataId = await gameService.getGameDataId(gameId);
    if (!gameDataId) {
      return res.status(404).json({
        success: false,
        error: 'Game has no game data',
      });
    }

    const cancelled = DownloadManager.cancelDownload(gameDataId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'No active download found for this game',
      });
    }

    res.json({
      success: true,
      cancelled: true,
      message: 'Download cancelled successfully',
    });
  })
);

export default router;
