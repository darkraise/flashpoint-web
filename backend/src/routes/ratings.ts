import { Router } from 'express';
import { GameRatingService } from '../services/GameRatingService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const ratingService = new GameRatingService();

router.use(requireFeature('enableRatings'));

const upsertRatingSchema = z.object({
  gameId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

const batchAggregateSchema = z.object({
  gameIds: z.array(z.string().min(1)).min(1).max(100),
});

// PUT / — Upsert rating (static, before parameterized routes)
router.put(
  '/',
  authenticate,
  requirePermission('games.rate'),
  validateRequest(upsertRatingSchema),
  logActivity('ratings.upsert', 'game_ratings'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId, rating } = req.body;
    const result = ratingService.upsertRating(req.user.id, gameId, rating);

    res.status(result.created ? 201 : 200).json({ success: true, data: result.rating });
  })
);

// GET /me — User's paginated rating history (static, before /me/:gameId and /:gameId)
router.get(
  '/me',
  authenticate,
  requirePermission('games.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const rawPage = parseInt(req.query.page as string, 10);
    const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);

    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 100));

    const allowedSortBy = ['updatedAt', 'rating', 'createdAt'] as const;
    type SortBy = (typeof allowedSortBy)[number];
    const sortBy: SortBy =
      req.query.sortBy && allowedSortBy.includes(req.query.sortBy as SortBy)
        ? (req.query.sortBy as SortBy)
        : 'updatedAt';

    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const result = ratingService.getUserRatings(req.user.id, page, limit, sortBy, sortOrder);

    const totalPages = Math.ceil(result.total / limit);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
      },
    });
  })
);

// GET /top — Top rated games for homepage (static, before parameterized routes)
router.get(
  '/top',
  authenticate,
  requirePermission('games.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 50));

    const games = await ratingService.getTopRatedGames(limit);

    res.json({ success: true, data: games });
  })
);

// POST /batch — Batch aggregates for multiple games (static, before parameterized routes)
router.post(
  '/batch',
  authenticate,
  requirePermission('games.read'),
  validateRequest(batchAggregateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameIds } = req.body;
    const record = ratingService.getBatchAggregates(gameIds);

    res.json({ success: true, data: record });
  })
);

// GET /me/:gameId — User's rating for a specific game (before /game/:gameId and /:gameId)
router.get(
  '/me/:gameId',
  authenticate,
  requirePermission('games.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId } = req.params;
    const rating = ratingService.getUserRating(req.user.id, gameId);

    res.json({ success: true, data: rating });
  })
);

// GET /game/:gameId — Aggregate for a game (guests can see via games.read)
router.get(
  '/game/:gameId',
  authenticate,
  requirePermission('games.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId } = req.params;
    const aggregate = ratingService.getGameAggregate(gameId);

    res.json({ success: true, data: aggregate });
  })
);

// DELETE /:gameId — Delete rating (LAST — parameterized route)
router.delete(
  '/:gameId',
  authenticate,
  requirePermission('games.rate'),
  logActivity('ratings.delete', 'game_ratings'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId } = req.params;
    const deleted = ratingService.deleteRating(req.user.id, gameId);

    if (!deleted) {
      throw new AppError(404, 'Rating not found');
    }

    res.status(204).send();
  })
);

export default router;
