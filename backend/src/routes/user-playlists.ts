import { Router } from 'express';
import { UserPlaylistService } from '../services/UserPlaylistService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
const playlistService = new UserPlaylistService();

// Apply feature flag check to all routes in this router
router.use(requireFeature('enablePlaylists'));

// Validation schemas
const createPlaylistSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().optional()
});

const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  icon: z.string().optional()
});

const addGamesSchema = z.object({
  gameIds: z.array(z.string()).min(1)
});

const removeGamesSchema = z.object({
  gameIds: z.array(z.string()).min(1)
});

const reorderGamesSchema = z.object({
  gameIdOrder: z.array(z.string()).min(1)
});

const copyFlashpointPlaylistSchema = z.object({
  flashpointPlaylistId: z.string(),
  newTitle: z.string().optional()
});

/**
 * GET /api/user-playlists
 * Get all playlists for the authenticated user
 */
router.get(
  '/',
  authenticate,
  requirePermission('playlists.read'),
  logActivity('playlists.view.list', 'user_playlists', (req, res) => ({
    playlistCount: res.locals.playlistCount || 0
  })),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlists = playlistService.getUserPlaylists(req.user.id);

      // Store count for activity logging
      res.locals.playlistCount = playlists.length;

      res.json(playlists);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user-playlists/stats
 * Get playlist statistics for the authenticated user
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('playlists.read'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const stats = playlistService.getUserPlaylistStats(req.user.id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user-playlists/:id
 * Get a specific playlist by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('playlists.read'),
  logActivity('playlists.view.detail', 'user_playlists', (req, res) => ({
    playlistId: req.params.id,
    playlistTitle: res.locals.playlistTitle || null,
    gameCount: res.locals.gameCount || 0
  })),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const playlist = playlistService.getPlaylistById(playlistId, req.user.id);
      if (!playlist) {
        throw new AppError(404, 'Playlist not found');
      }

      // Store for activity logging
      res.locals.playlistTitle = playlist.title;
      res.locals.gameCount = playlist.gameCount;

      res.json(playlist);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user-playlists/:id/games
 * Get all games in a playlist with full game data
 */
router.get(
  '/:id/games',
  authenticate,
  requirePermission('playlists.read'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);
      res.json(games);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/user-playlists
 * Create a new playlist
 */
router.post(
  '/',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('playlists.create', 'user_playlists'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const data = createPlaylistSchema.parse(req.body);
      const playlist = playlistService.createPlaylist(req.user.id, data);

      res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/user-playlists/:id
 * Update a playlist
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.update.metadata', 'user_playlists', (req, res) => ({
    playlistId: req.params.id,
    fieldsUpdated: Object.keys(req.body)
  })),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const data = updatePlaylistSchema.parse(req.body);
      const playlist = playlistService.updatePlaylist(playlistId, req.user.id, data);

      if (!playlist) {
        throw new AppError(404, 'Playlist not found');
      }

      res.json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/user-playlists/:id
 * Delete a playlist
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('playlists.delete'),
  logActivity('playlists.delete', 'user_playlists'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const success = playlistService.deletePlaylist(playlistId, req.user.id);

      if (!success) {
        throw new AppError(404, 'Playlist not found');
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/user-playlists/:id/games
 * Add games to a playlist
 * Returns the updated playlist with game data
 */
router.post(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.games.add', 'user_playlist_games', (req) => ({
    playlistId: req.params.id,
    gamesAdded: req.body.gameIds?.length || 0
  })),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const { gameIds } = addGamesSchema.parse(req.body);
      const success = playlistService.addGamesToPlaylist(playlistId, req.user.id, gameIds);

      if (!success) {
        throw new AppError(404, 'Playlist not found');
      }

      // Return updated playlist with game data
      const updatedPlaylist = playlistService.getPlaylistById(playlistId, req.user.id);
      const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);

      res.json({
        ...updatedPlaylist,
        games
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/user-playlists/:id/games
 * Remove games from a playlist
 * Returns the updated playlist with game data
 */
router.delete(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.games.remove', 'user_playlist_games', (req) => ({
    playlistId: req.params.id,
    gamesRemoved: req.body.gameIds?.length || 0
  })),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const { gameIds } = removeGamesSchema.parse(req.body);
      const success = playlistService.removeGamesFromPlaylist(playlistId, req.user.id, gameIds);

      if (!success) {
        throw new AppError(404, 'Playlist not found');
      }

      // Return updated playlist with game data
      const updatedPlaylist = playlistService.getPlaylistById(playlistId, req.user.id);
      const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);

      res.json({
        ...updatedPlaylist,
        games
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * PUT /api/user-playlists/:id/games/reorder
 * Reorder games in a playlist
 * Returns the updated playlist with game data
 */
router.put(
  '/:id/games/reorder',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.games.reorder', 'user_playlist_games', (req) => ({
    playlistId: req.params.id,
    gameCount: req.body.gameIdOrder?.length || 0
  })),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const playlistId = parseInt(req.params.id, 10);
      if (isNaN(playlistId)) {
        throw new AppError(400, 'Invalid playlist ID');
      }

      const { gameIdOrder } = reorderGamesSchema.parse(req.body);
      const success = playlistService.reorderGames(playlistId, req.user.id, gameIdOrder);

      if (!success) {
        throw new AppError(404, 'Playlist not found');
      }

      // Return updated playlist with game data
      const updatedPlaylist = playlistService.getPlaylistById(playlistId, req.user.id);
      const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);

      res.json({
        ...updatedPlaylist,
        games
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * POST /api/user-playlists/copy-flashpoint
 * Copy a Flashpoint playlist to user's playlists
 */
router.post(
  '/copy-flashpoint',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('playlists.create', 'user_playlists'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const { flashpointPlaylistId, newTitle } = copyFlashpointPlaylistSchema.parse(req.body);
      const playlist = await playlistService.copyFlashpointPlaylist(
        req.user.id,
        flashpointPlaylistId,
        newTitle
      );

      if (!playlist) {
        throw new AppError(404, 'Flashpoint playlist not found');
      }

      res.status(201).json(playlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

export default router;
