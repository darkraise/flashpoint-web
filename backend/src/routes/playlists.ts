import { Router } from 'express';
import { PlaylistService, CreatePlaylistDto, AddGamesToPlaylistDto } from '../services/PlaylistService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const playlistService = new PlaylistService();

// GET /api/playlists - List all playlists
router.get('/', async (req, res, next) => {
  try {
    const playlists = await playlistService.getAllPlaylists();
    res.json(playlists);
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/:id - Get playlist by ID with games
router.get('/:id', async (req, res, next) => {
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
router.post('/', async (req, res, next) => {
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
});

// POST /api/playlists/:id/games - Add games to playlist
router.post('/:id/games', async (req, res, next) => {
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
});

// DELETE /api/playlists/:id/games - Remove games from playlist
router.delete('/:id/games', async (req, res, next) => {
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
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await playlistService.deletePlaylist(req.params.id);

    if (!success) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
