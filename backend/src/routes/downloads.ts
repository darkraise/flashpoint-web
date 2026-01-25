import { Router, Request, Response } from 'express';
import { DownloadManager } from '../services/DownloadManager';
import { PreferencesService } from '../services/PreferencesService';
import { GameDatabaseUpdater } from '../services/GameDatabaseUpdater';
import { GameService } from '../services/GameService';
import { ActivityService } from '../services/ActivityService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { logger } from '../utils/logger';

const router = Router();
const gameService = new GameService();
const activityService = new ActivityService();

/**
 * POST /api/games/:id/download
 * Start downloading a game's data.
 *
 * Request body: { gameDataId?: number }
 * - If gameDataId not provided, uses game.activeDataId
 *
 * Requires: games.download permission
 *
 * Responses:
 * - 200: Download started successfully
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Game not found or has no game data
 * - 409: Game data already downloaded
 * - 500: Download failed
 */
router.post(
  '/:id/download',
  authenticate,
  requirePermission('games.download'),
  logActivity('games.download', 'games', (req, res) => ({
    gameId: req.params.id,
    gameDataId: req.body.gameDataId || res.locals.gameDataId,
    gameTitle: res.locals.gameTitle,
    sources: res.locals.sources
  })),
  async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    const { gameDataId: requestedGameDataId } = req.body;

    logger.info('Download request received', { gameId, requestedGameDataId });

    // Get game from database
    const game = await gameService.getGameById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    // Determine which game data to download
    let gameDataId = requestedGameDataId;
    if (!gameDataId) {
      // Query game_data table to find the game data entry for this game
      const foundGameDataId = await gameService.getGameDataId(gameId);
      if (!foundGameDataId) {
        return res.status(404).json({
          success: false,
          error: 'Game has no game data to download'
        });
      }
      gameDataId = foundGameDataId;
    }

    // Check if already downloaded
    const isDownloaded = await GameDatabaseUpdater.isDownloaded(gameDataId);
    if (isDownloaded) {
      return res.status(409).json({
        success: false,
        error: 'Game data already downloaded'
      });
    }

    // Get game data info
    const gameData = await GameDatabaseUpdater.getGameData(gameDataId);
    if (!gameData) {
      return res.status(404).json({
        success: false,
        error: 'Game data not found'
      });
    }

    // Get data sources from preferences
    const sources = await PreferencesService.getGameDataSources();
    if (sources.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No game data sources configured. Please configure gameDataSources in preferences.json'
      });
    }

    // Store metadata for activity logging
    res.locals.gameDataId = gameDataId;
    res.locals.gameTitle = game.title;
    res.locals.sources = sources.map(s => s.name);

    // Capture metadata for background error logging
    const downloadMetadata = {
      gameId,
      gameDataId,
      gameTitle: game.title,
      sha256: gameData.sha256,
      sources: sources.map(s => s.name),
      userId: req.user?.id,
      username: req.user?.username,
      ipAddress: req.ip
    };

    // Start download (non-blocking)
    // We don't wait for it to complete - client uses SSE endpoint for progress
    DownloadManager.downloadGameData(
      gameDataId,
      sources,
      undefined, // Progress callback handled by SSE endpoint
      undefined, // Details callback handled by SSE endpoint
      undefined  // No abort signal for now
    ).catch(async error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Background download failed', {
        gameId,
        gameDataId,
        error: errorMessage
      });

      // Log download failure activity
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
          error: errorMessage
        },
        ipAddress: downloadMetadata.ipAddress,
        userAgent: req.get('user-agent')
      });
    });

    // Return success immediately
    res.json({
      success: true,
      message: 'Download started',
      gameDataId,
      sha256: gameData.sha256
    });
  } catch (error) {
    logger.error('Download endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  }
);

/**
 * GET /api/games/:id/download/progress
 * Server-Sent Events endpoint for download progress tracking.
 *
 * Streams progress updates for active download.
 * Closes connection when download completes or errors.
 *
 * Requires: games.download permission
 *
 * Event data format:
 * {
 *   percent: number (0-100),
 *   status: 'downloading' | 'validating' | 'importing' | 'complete' | 'error',
 *   details: string,
 *   error?: string
 * }
 */
router.get(
  '/:id/download/progress',
  authenticate,
  requirePermission('games.download'),
  async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    logger.info('SSE connection established', { gameId });

    // Get game to find gameDataId
    const game = await gameService.getGameById(gameId);
    if (!game) {
      res.write(`data: ${JSON.stringify({
        status: 'error',
        error: 'Game not found'
      })}\n\n`);
      res.end();
      return;
    }

    const gameDataId = await gameService.getGameDataId(gameId);
    if (!gameDataId) {
      res.write(`data: ${JSON.stringify({
        status: 'error',
        error: 'Game has no game data'
      })}\n\n`);
      res.end();
      return;
    }

    // Send initial status
    res.write(`data: ${JSON.stringify({
      percent: 0,
      status: 'waiting',
      details: 'Preparing download...'
    })}\n\n`);

    // Poll for download progress
    // Note: This is a simplified implementation. In production, you'd want
    // a proper event emitter system to push updates rather than polling.
    const pollInterval = setInterval(async () => {
      try {
        // Check if download is still active
        const isActive = DownloadManager.isDownloadActive(gameDataId);

        if (!isActive) {
          // Check if download completed successfully
          const isDownloaded = await GameDatabaseUpdater.isDownloaded(gameDataId);

          if (isDownloaded) {
            res.write(`data: ${JSON.stringify({
              percent: 100,
              status: 'complete',
              details: 'Download completed successfully'
            })}\n\n`);

            // Log download completion activity
            const gameData = await GameDatabaseUpdater.getGameData(gameDataId);
            await activityService.log({
              userId: req.user?.id,
              username: req.user?.username,
              action: 'games.download.complete',
              resource: 'games',
              resourceId: gameId,
              details: {
                gameDataId,
                gameTitle: game.title,
                sha256: gameData?.sha256
              },
              ipAddress: req.ip,
              userAgent: req.get('user-agent')
            });
          } else {
            res.write(`data: ${JSON.stringify({
              percent: 0,
              status: 'error',
              details: 'Download not active'
            })}\n\n`);
          }

          clearInterval(pollInterval);
          res.end();
        } else {
          // Send heartbeat
          res.write(`data: ${JSON.stringify({
            percent: 0,
            status: 'downloading',
            details: 'Download in progress...'
          })}\n\n`);
        }
      } catch (error) {
        logger.error('Error in SSE poll', { error });
        clearInterval(pollInterval);
        res.end();
      }
    }, 1000); // Poll every second

    // Clean up on client disconnect
    req.on('close', () => {
      logger.info('SSE connection closed', { gameId });
      clearInterval(pollInterval);
      res.end();
    });
  } catch (error) {
    logger.error('SSE endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  }
);

/**
 * DELETE /api/games/:id/download
 * Cancel an active download.
 *
 * Requires: games.download permission
 *
 * Responses:
 * - 200: Download cancelled successfully
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: No active download found
 * - 500: Error cancelling download
 */
router.delete(
  '/:id/download',
  authenticate,
  requirePermission('games.download'),
  logActivity('games.download_cancel', 'games'),
  async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;

    logger.info('Download cancel request', { gameId });

    // Get game to find gameDataId
    const game = await gameService.getGameById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const gameDataId = await gameService.getGameDataId(gameId);
    if (!gameDataId) {
      return res.status(404).json({
        success: false,
        error: 'Game has no game data'
      });
    }

    // Attempt to cancel download
    const cancelled = DownloadManager.cancelDownload(gameDataId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'No active download found for this game'
      });
    }

    res.json({
      success: true,
      cancelled: true,
      message: 'Download cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel download error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  }
);

export default router;
