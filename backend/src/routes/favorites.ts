import { Router } from 'express';
import { FavoritesService } from '../services/FavoritesService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';

const router = Router();
const favoritesService = new FavoritesService();

router.use(requireFeature('enableFavorites'));

const toggleFavoriteSchema = z.object({
  gameId: z.string(),
});

const batchAddSchema = z.object({
  gameIds: z.array(z.string()).min(1).max(100),
});

const batchRemoveSchema = z.object({
  gameIds: z.array(z.string()).min(1).max(100),
});

router.get(
  '/',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string, 10) || 50, 100)
      : undefined;
    const offset = req.query.offset
      ? Math.max(0, parseInt(req.query.offset as string, 10) || 0)
      : undefined;

    const favorites = favoritesService.getUserFavorites(req.user.id, limit, offset);
    res.json(favorites);
  })
);

router.get(
  '/game-ids',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const gameIds = favoritesService.getUserFavoriteGameIds(req.user.id);
    res.json({ gameIds });
  })
);

router.get(
  '/games',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string, 10) || 50, 100)
      : undefined;
    const offset = req.query.offset
      ? Math.max(0, parseInt(req.query.offset as string, 10) || 0)
      : undefined;

    const allowedSortBy = ['title', 'dateAdded'];
    const sortBy =
      req.query.sortBy && allowedSortBy.includes(req.query.sortBy as string)
        ? (req.query.sortBy as 'title' | 'dateAdded')
        : 'dateAdded';

    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const games = await favoritesService.getUserFavoriteGames(
      req.user.id,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json(games);
  })
);

router.get(
  '/stats',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const stats = favoritesService.getFavoritesStats(req.user.id);
    res.json(stats);
  })
);

router.post(
  '/toggle',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('favorites.toggle', 'user_favorites'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId } = toggleFavoriteSchema.parse(req.body);
    const result = favoritesService.toggleFavorite(req.user.id, gameId);

    res.json(result);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('favorites.add', 'user_favorites'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId } = toggleFavoriteSchema.parse(req.body);
    const success = favoritesService.addFavorite(req.user.id, gameId);

    res.status(success ? 201 : 200).json({ success });
  })
);

router.post(
  '/batch',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('favorites.batch_add', 'user_favorites'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameIds } = batchAddSchema.parse(req.body);
    const result = favoritesService.addFavoritesBatch(req.user.id, gameIds);

    res.json(result);
  })
);

// Must be registered before /:gameId to avoid being shadowed

router.delete(
  '/batch',
  authenticate,
  requirePermission('playlists.delete'),
  logActivity('favorites.batch_remove', 'user_favorites'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameIds } = batchRemoveSchema.parse(req.body);
    const result = favoritesService.removeFavoritesBatch(req.user.id, gameIds);

    res.json(result);
  })
);

router.delete(
  '/:gameId',
  authenticate,
  requirePermission('playlists.delete'),
  logActivity('favorites.remove', 'user_favorites'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { gameId } = req.params;
    const success = favoritesService.removeFavorite(req.user.id, gameId);

    if (!success) {
      throw new AppError(404, 'Favorite not found');
    }

    res.status(204).send();
  })
);

router.delete(
  '/',
  authenticate,
  requirePermission('playlists.delete'),
  logActivity('favorites.clear_all', 'user_favorites'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const count = favoritesService.clearAllFavorites(req.user.id);
    res.json({ removed: count });
  })
);

export default router;
