import { Router } from 'express';
import { CommunityPlaylistService } from '../services/CommunityPlaylistService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const communityPlaylistService = new CommunityPlaylistService();

// GET /api/community-playlists - Fetch list of community playlists from wiki
router.get('/', async (req, res, next) => {
  try {
    const playlists = await communityPlaylistService.fetchCommunityPlaylists();
    res.json(playlists);
  } catch (error) {
    next(error);
  }
});

// POST /api/community-playlists/download - Download a specific playlist
router.post('/download', async (req, res, next) => {
  try {
    const { downloadUrl } = req.body;

    if (!downloadUrl) {
      throw new AppError(400, 'downloadUrl is required');
    }

    const result = await communityPlaylistService.downloadPlaylist(downloadUrl);

    if (!result.success) {
      if (result.conflict) {
        throw new AppError(409, result.error || 'A playlist with this ID already exists');
      }
      throw new AppError(500, result.error || 'Failed to download playlist');
    }

    res.status(201).json(result.playlist);
  } catch (error) {
    next(error);
  }
});

export default router;
