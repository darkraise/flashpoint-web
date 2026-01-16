import { Router, Request, Response, NextFunction } from 'express';
import { PlayTrackingService } from '../services/PlayTrackingService';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const playTrackingService = new PlayTrackingService();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/play/start
 * Start a new play session
 */
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gameId, gameTitle } = req.body;

    if (!gameId || !gameTitle) {
      throw new AppError(400, 'gameId and gameTitle are required');
    }

    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const sessionId = await playTrackingService.startPlaySession(
      req.user.id,
      gameId,
      gameTitle
    );

    res.json({
      success: true,
      sessionId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/play/end
 * End a play session
 */
router.post(
  '/end',
  logActivity('play.end', 'games'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        throw new AppError(400, 'sessionId is required');
      }

      await playTrackingService.endPlaySession(sessionId);

      res.json({
        success: true,
        message: 'Play session ended successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/play/stats
 * Get current user's overall stats
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const stats = await playTrackingService.getUserStats(req.user.id);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/play/game-stats
 * Get current user's game-specific stats
 */
router.get('/game-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const stats = await playTrackingService.getUserGameStats(req.user.id, limit, offset);

    res.json({
      data: stats,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/play/history
 * Get current user's play history
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await playTrackingService.getUserPlayHistory(req.user.id, limit, offset);

    res.json({
      data: history,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/play/top-games
 * Get current user's top played games
 */
router.get('/top-games', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const topGames = await playTrackingService.getTopGames(req.user.id, limit);

    res.json(topGames);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/play/activity-over-time
 * Get play activity over time (daily aggregation)
 */
router.get('/activity-over-time', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

    const activity = await playTrackingService.getPlayActivityOverTime(req.user.id, days);

    res.json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/play/games-distribution
 * Get games distribution by playtime
 */
router.get('/games-distribution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    const distribution = await playTrackingService.getGamesDistribution(req.user.id, limit);

    res.json(distribution);
  } catch (error) {
    next(error);
  }
});

export default router;
