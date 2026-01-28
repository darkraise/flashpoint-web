import { Router } from 'express';
import { FavoritesService } from '../services/FavoritesService';
import { authenticate, softAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';

const router = Router();
const favoritesService = new FavoritesService();

// Apply soft auth first so admins can bypass feature flags
// softAuth populates req.user if token exists, but never throws errors
router.use(softAuth);

// Apply feature flag check to all routes in this router
// Admins with settings.update permission will bypass this check
router.use(requireFeature('enableFavorites'));

// Validation schemas
const toggleFavoriteSchema = z.object({
  gameId: z.string()
});

const batchAddSchema = z.object({
  gameIds: z.array(z.string()).min(1)
});

const batchRemoveSchema = z.object({
  gameIds: z.array(z.string()).min(1)
});

/**
 * GET /api/favorites
 * Get all favorites for the authenticated user
 */
router.get(
  '/',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const favorites = favoritesService.getUserFavorites(req.user.id, limit, offset);
    res.json(favorites);
  })
);

/**
 * GET /api/favorites/game-ids
 * Get favorite game IDs for the authenticated user
 */
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

/**
 * GET /api/favorites/games
 * Get favorite games with full game data for the authenticated user
 */
router.get(
  '/games',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    const sortBy = (req.query.sortBy as 'title' | 'dateAdded') || 'dateAdded';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const games = await favoritesService.getUserFavoriteGames(req.user.id, limit, offset, sortBy, sortOrder);
    res.json(games);
  })
);

/**
 * GET /api/favorites/stats
 * Get favorites statistics for the authenticated user
 */
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

/**
 * POST /api/favorites/toggle
 * Toggle favorite status for a game
 */
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

/**
 * POST /api/favorites
 * Add a game to favorites
 */
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

/**
 * DELETE /api/favorites/:gameId
 * Remove a game from favorites
 */
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

/**
 * POST /api/favorites/batch
 * Batch add favorites
 */
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

/**
 * DELETE /api/favorites/batch
 * Batch remove favorites
 */
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

/**
 * DELETE /api/favorites
 * Clear all favorites for the authenticated user
 */
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
