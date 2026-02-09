import { Router, Request, Response } from 'express';
import { PlayTrackingService } from '../services/PlayTrackingService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { logActivity } from '../middleware/activityLogger';
import { z } from 'zod';

const router = Router();
const playTrackingService = new PlayTrackingService();

const startPlaySessionSchema = z.object({
  gameId: z.string().min(1).max(36),
  gameTitle: z.string().min(1).max(255),
});

const endPlaySessionSchema = z.object({
  sessionId: z.string().uuid(),
});

const LIMITS = {
  GAME_STATS_DEFAULT: 50,
  GAME_STATS_MAX: 100,
  HISTORY_DEFAULT: 50,
  HISTORY_MAX: 100,
  TOP_GAMES_DEFAULT: 10,
  TOP_GAMES_MAX: 50,
  ACTIVITY_DAYS_DEFAULT: 30,
  ACTIVITY_DAYS_MAX: 365,
  GAMES_DISTRIBUTION_DEFAULT: 10,
  GAMES_DISTRIBUTION_MAX: 20,
} as const;

router.use(requireFeature('enableStatistics'));
router.use(authenticate);
router.use(requirePermission('games.play'));

router.post(
  '/start',
  logActivity('play.start', 'games', (req, res) => ({
    sessionId: res.locals.sessionId,
    gameTitle: req.body.gameTitle,
    gameId: req.body.gameId,
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId, gameTitle } = startPlaySessionSchema.parse(req.body);

    const sessionId = await playTrackingService.startPlaySession(req.user!.id, gameId, gameTitle);

    res.locals.sessionId = sessionId;

    res.json({
      success: true,
      sessionId,
    });
  })
);

router.post(
  '/end',
  logActivity('play.end', 'games'),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = endPlaySessionSchema.parse(req.body);

    await playTrackingService.endPlaySession(sessionId, req.user!.id);

    res.json({
      success: true,
      message: 'Play session ended successfully',
    });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await playTrackingService.getUserStats(req.user!.id);

    res.json(stats);
  })
);

router.get(
  '/game-stats',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(
      parseInt(req.query.limit as string) || LIMITS.GAME_STATS_DEFAULT,
      LIMITS.GAME_STATS_MAX
    );
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const stats = await playTrackingService.getUserGameStats(req.user!.id, limit, offset);

    res.json({
      data: stats,
      limit,
      offset,
    });
  })
);

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(
      parseInt(req.query.limit as string) || LIMITS.HISTORY_DEFAULT,
      LIMITS.HISTORY_MAX
    );
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const history = await playTrackingService.getUserPlayHistory(req.user!.id, limit, offset);

    res.json({
      data: history,
      limit,
      offset,
    });
  })
);

router.get(
  '/top-games',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(
      parseInt(req.query.limit as string) || LIMITS.TOP_GAMES_DEFAULT,
      LIMITS.TOP_GAMES_MAX
    );

    const topGames = await playTrackingService.getTopGames(req.user!.id, limit);

    res.json(topGames);
  })
);

router.get(
  '/activity-over-time',
  asyncHandler(async (req: Request, res: Response) => {
    const days = Math.min(
      parseInt(req.query.days as string) || LIMITS.ACTIVITY_DAYS_DEFAULT,
      LIMITS.ACTIVITY_DAYS_MAX
    );

    const activity = await playTrackingService.getPlayActivityOverTime(req.user!.id, days);

    res.json(activity);
  })
);

router.get(
  '/games-distribution',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(
      parseInt(req.query.limit as string) || LIMITS.GAMES_DISTRIBUTION_DEFAULT,
      LIMITS.GAMES_DISTRIBUTION_MAX
    );

    const distribution = await playTrackingService.getGamesDistribution(req.user!.id, limit);

    res.json(distribution);
  })
);

export default router;
