import { Router } from 'express';
import { PlaylistService } from '../services/PlaylistService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { logActivity } from '../middleware/activityLogger';
import { z } from 'zod';

const router = Router();
const playlistService = new PlaylistService();

router.use(requireFeature('enablePlaylists'));

const createPlaylistSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const addGamesToPlaylistSchema = z.object({
  gameIds: z.array(z.string()).min(1).max(100),
});

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const playlists = await playlistService.getAllPlaylists();
    res.json(playlists);
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const playlist = await playlistService.getPlaylistById(req.params.id);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('playlists.create', 'playlists'),
  asyncHandler(async (req, res) => {
    const data = createPlaylistSchema.parse(req.body);

    const playlist = await playlistService.createPlaylist(data);
    res.status(201).json(playlist);
  })
);

router.post(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.add_games', 'playlists'),
  asyncHandler(async (req, res) => {
    const data = addGamesToPlaylistSchema.parse(req.body);

    const playlist = await playlistService.addGamesToPlaylist(req.params.id, data);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  })
);

router.delete(
  '/:id/games',
  authenticate,
  requirePermission('playlists.update'),
  logActivity('playlists.remove_games', 'playlists'),
  asyncHandler(async (req, res) => {
    const data = addGamesToPlaylistSchema.parse(req.body);

    const playlist = await playlistService.removeGamesFromPlaylist(req.params.id, data);

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
