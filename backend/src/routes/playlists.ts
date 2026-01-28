import { Router } from 'express';
import { PlaylistService, CreatePlaylistDto, AddGamesToPlaylistDto } from '../services/PlaylistService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, softAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const playlistService = new PlaylistService();

// Apply soft auth first so admins can bypass feature flags
// softAuth populates req.user if token exists, but never throws errors
router.use(softAuth);

// Apply feature flag check to all routes in this router
// Admins with settings.update permission will bypass this check
router.use(requireFeature('enablePlaylists'));

// GET /api/playlists - List all playlists
// No additional auth needed - softAuth already runs at router level
router.get('/', asyncHandler(async (req, res) => {
  const playlists = await playlistService.getAllPlaylists();
  res.json(playlists);
}));

// GET /api/playlists/:id - Get playlist by ID with games
// No additional auth needed - softAuth already runs at router level
router.get('/:id', asyncHandler(async (req, res) => {
  const playlist = await playlistService.getPlaylistById(req.params.id);

  if (!playlist) {
    throw new AppError(404, 'Playlist not found');
  }

  res.json(playlist);
}));

// POST /api/playlists - Create new playlist
router.post(
  '/',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('playlists.create', 'playlists'),
  asyncHandler(async (req, res) => {
    const data: CreatePlaylistDto = req.body;

    if (!data.title) {
      throw new AppError(400, 'Playlist title is required');
    }

    const playlist = await playlistService.createPlaylist(data);
    res.status(201).json(playlist);
  })
);

// POST /api/playlists/:id/games - Add games to playlist
router.post(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.add_games', 'playlists'),
  asyncHandler(async (req, res) => {
    const data: AddGamesToPlaylistDto = req.body;

    if (!data.gameIds || !Array.isArray(data.gameIds)) {
      throw new AppError(400, 'gameIds array is required');
    }

    const playlist = await playlistService.addGamesToPlaylist(req.params.id, data);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  })
);

// DELETE /api/playlists/:id/games - Remove games from playlist
router.delete(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.remove_games', 'playlists'),
  asyncHandler(async (req, res) => {
    const data: AddGamesToPlaylistDto = req.body;

    if (!data.gameIds || !Array.isArray(data.gameIds)) {
      throw new AppError(400, 'gameIds array is required');
    }

    const playlist = await playlistService.removeGamesFromPlaylist(req.params.id, data);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  })
);

// DELETE /api/playlists/:id - Delete playlist
router.delete(
  '/:id',
  authenticate,
  requirePermission('playlists.delete'),
  logActivity('playlists.delete', 'playlists'),
  asyncHandler(async (req, res) => {
    const success = await playlistService.deletePlaylist(req.params.id);

    if (!success) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json({ success: true, message: 'Playlist deleted' });
  })
);

export default router;
