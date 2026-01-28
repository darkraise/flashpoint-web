import { Router, Request, Response } from 'express';
import { GameFileService } from '../services/GameFileService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';

const router = Router();
const gameFileService = new GameFileService();

/**
 * GET /game-files/* - Proxy game file requests with automatic fallback
 *
 * Examples:
 * - /game-files/www.example.com/path/file.swf
 * - /game-files/cdn.games.com/assets/game.swf
 */
router.get('/*', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Extract path after /game-files/
    const urlPath = req.path.substring(1); // Remove leading slash

    if (!urlPath) {
      throw new AppError(400, 'File path is required');
    }

    logger.info(`[GameFilesRoute] Request: ${urlPath}`);

    // Get the file (tries Game Server first, then external sources)
    const result = await gameFileService.getGameFile(urlPath);

    logger.info(`[GameFilesRoute] Serving from ${result.source}: ${result.data.length} bytes`);

    // Set headers
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.data.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Source', result.source); // Debug header

    // Send file
    res.send(result.data);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new AppError(404, 'Game file not found in any source');
    } else {
      logger.error('[GameFilesRoute] Error:', error);
      throw error;
    }
  }
}));

export default router;
