import { Router } from 'express';
import { UserPlaylistService } from '../services/UserPlaylistService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { rateLimitStandard } from '../middleware/rateLimiter';
import { z } from 'zod';

const router = Router();
const playlistService = new UserPlaylistService();

// Apply rate limiting to prevent abuse
router.use(rateLimitStandard);

// Global softAuth (from server.ts) already populates req.user for all routes
// No need to apply softAuth again at router level

// Apply feature flag check to all routes in this router
// Admins with settings.update permission will bypass this check (via global softAuth)
router.use(requireFeature('enablePlaylists'));

// Validation schemas
const createPlaylistSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const addGamesSchema = z.object({
  gameIds: z.array(z.string()).min(1).max(100),
});

const removeGamesSchema = z.object({
  gameIds: z.array(z.string()).min(1).max(100),
});

const reorderGamesSchema = z.object({
  gameIdOrder: z.array(z.string()).min(1).max(100),
});

const copyFlashpointPlaylistSchema = z.object({
  flashpointPlaylistId: z.string(),
  newTitle: z.string().optional(),
});

const enableSharingSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  showOwner: z.boolean().optional(),
});

const updateShareSettingsSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  showOwner: z.boolean().optional(),
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
    playlistCount: res.locals.playlistCount || 0,
  })),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const playlists = playlistService.getUserPlaylists(req.user.id);

    // Store count for activity logging
    res.locals.playlistCount = playlists.length;

    res.json(playlists);
  })
);

/**
 * GET /api/user-playlists/stats
 * Get playlist statistics for the authenticated user
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const stats = playlistService.getUserPlaylistStats(req.user.id);
    res.json(stats);
  })
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
    gameCount: res.locals.gameCount || 0,
  })),
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * GET /api/user-playlists/:id/games
 * Get all games in a playlist with full game data
 */
router.get(
  '/:id/games',
  authenticate,
  requirePermission('playlists.read'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const playlistId = parseInt(req.params.id, 10);
    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);
    res.json(games);
  })
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
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const data = createPlaylistSchema.parse(req.body);
    const playlist = playlistService.createPlaylist(req.user.id, data);

    res.status(201).json(playlist);
  })
);

/**
 * PATCH /api/user-playlists/:id
 * Update a playlist
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.update.metadata', 'user_playlists', (req, _res) => ({
    playlistId: req.params.id,
    fieldsUpdated: Object.keys(req.body),
  })),
  asyncHandler(async (req, res) => {
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
  })
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
  asyncHandler(async (req, res) => {
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
  })
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
    gamesAdded: req.body.gameIds?.length || 0,
  })),
  asyncHandler(async (req, res) => {
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
      games,
    });
  })
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
    gamesRemoved: req.body.gameIds?.length || 0,
  })),
  asyncHandler(async (req, res) => {
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
      games,
    });
  })
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
    gameCount: req.body.gameIdOrder?.length || 0,
  })),
  asyncHandler(async (req, res) => {
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
      games,
    });
  })
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
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * POST /api/user-playlists/:id/share/enable
 * Enable sharing for a playlist
 */
router.post(
  '/:id/share/enable',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.share.enable', 'user_playlists'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const playlistId = parseInt(req.params.id, 10);
    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const { expiresAt, showOwner } = enableSharingSchema.parse(req.body);

    const shareData = playlistService.enableSharing(playlistId, req.user.id, {
      expiresAt,
      showOwner,
    });

    if (!shareData) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(shareData);
  })
);

/**
 * POST /api/user-playlists/:id/share/disable
 * Disable sharing for a playlist
 */
router.post(
  '/:id/share/disable',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.share.disable', 'user_playlists'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const playlistId = parseInt(req.params.id, 10);
    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const playlist = playlistService.disableSharing(playlistId, req.user.id);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json({ success: true });
  })
);

/**
 * POST /api/user-playlists/:id/share/regenerate
 * Regenerate share token (invalidates old links)
 */
router.post(
  '/:id/share/regenerate',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.share.regenerate', 'user_playlists'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const playlistId = parseInt(req.params.id, 10);
    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const shareData = playlistService.regenerateShareToken(playlistId, req.user.id);

    if (!shareData) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(shareData);
  })
);

/**
 * PATCH /api/user-playlists/:id/share/settings
 * Update share settings (expiry, show_owner) without regenerating token
 */
router.patch(
  '/:id/share/settings',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.share.update_settings', 'user_playlists'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const playlistId = parseInt(req.params.id, 10);
    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const { expiresAt, showOwner } = updateShareSettingsSchema.parse(req.body);

    const shareData = playlistService.updateShareSettings(playlistId, req.user.id, {
      expiresAt,
      showOwner,
    });

    if (!shareData) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(shareData);
  })
);

export default router;
