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

router.use(rateLimitStandard);
router.use(requireFeature('enablePlaylists'));

const createPlaylistSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
});

const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
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
  flashpointPlaylistId: z.string().uuid('Invalid playlist ID format'),
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

    const rawPage = parseInt(req.query.page as string, 10);
    const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);

    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = isNaN(rawLimit) ? 50 : Math.max(1, Math.min(rawLimit, 100));

    const result = playlistService.getUserPlaylistsPaginated(req.user.id, page, limit);

    res.locals.playlistCount = result.total;

    const totalPages = Math.ceil(result.total / limit);

    res.json({
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

    res.locals.playlistTitle = playlist.title;
    res.locals.gameCount = playlist.gameCount;

    res.json(playlist);
  })
);

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

    const updatedPlaylist = playlistService.getPlaylistById(playlistId, req.user.id);
    const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);

    res.json({
      ...updatedPlaylist,
      games,
    });
  })
);

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

    const updatedPlaylist = playlistService.getPlaylistById(playlistId, req.user.id);
    const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);

    res.json({
      ...updatedPlaylist,
      games,
    });
  })
);

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

    const updatedPlaylist = playlistService.getPlaylistById(playlistId, req.user.id);
    const games = await playlistService.getPlaylistGamesWithData(playlistId, req.user.id);

    res.json({
      ...updatedPlaylist,
      games,
    });
  })
);

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
