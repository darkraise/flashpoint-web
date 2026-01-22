import { Router } from 'express';
import { PlaylistService, CreatePlaylistDto, AddGamesToPlaylistDto } from '../services/PlaylistService';
import { AppError } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const playlistService = new PlaylistService();

// Apply feature flag check to all routes in this router
router.use(requireFeature('enablePlaylists'));

// GET /api/playlists - List all playlists
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const playlists = await playlistService.getAllPlaylists();
    res.json(playlists);
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/:id - Get playlist by ID with games
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const playlist = await playlistService.getPlaylistById(req.params.id);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

// POST /api/playlists - Create new playlist
router.post(
  '/',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('playlists.create', 'playlists'),
  async (req, res, next) => {
    try {
      const data: CreatePlaylistDto = req.body;

      if (!data.title) {
        throw new AppError(400, 'Playlist title is required');
      }

      const playlist = await playlistService.createPlaylist(data);
      res.status(201).json(playlist);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/playlists/:id/games - Add games to playlist
router.post(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.add_games', 'playlists'),
  async (req, res, next) => {
    try {
      const data: AddGamesToPlaylistDto = req.body;

      if (!data.gameIds || !Array.isArray(data.gameIds)) {
        throw new AppError(400, 'gameIds array is required');
      }

      const playlist = await playlistService.addGamesToPlaylist(req.params.id, data);

      if (!playlist) {
        throw new AppError(404, 'Playlist not found');
      }

      res.json(playlist);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/playlists/:id/games - Remove games from playlist
router.delete(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.remove_games', 'playlists'),
  async (req, res, next) => {
    try {
      const data: AddGamesToPlaylistDto = req.body;

      if (!data.gameIds || !Array.isArray(data.gameIds)) {
        throw new AppError(400, 'gameIds array is required');
      }

      const playlist = await playlistService.removeGamesFromPlaylist(req.params.id, data);

      if (!playlist) {
        throw new AppError(404, 'Playlist not found');
      }

      res.json(playlist);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/playlists/:id - Delete playlist
router.delete(
  '/:id',
  authenticate,
  requirePermission('playlists.delete'),
  logActivity('playlists.delete', 'playlists'),
  async (req, res, next) => {
    try {
      const success = await playlistService.deletePlaylist(req.params.id);

      if (!success) {
        throw new AppError(404, 'Playlist not found');
      }

      res.json({ success: true, message: 'Playlist deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
