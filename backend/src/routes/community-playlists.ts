import { Router } from 'express';
import { CommunityPlaylistService } from '../services/CommunityPlaylistService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { optionalAuth } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const communityPlaylistService = new CommunityPlaylistService();

// GET /api/community-playlists - Fetch list of community playlists from wiki
router.get(
  '/',
  optionalAuth,
  logActivity('playlists.community.browse', 'community_playlists', (req, res) => ({
    playlistCount: res.locals.playlistCount || 0,
  })),
  asyncHandler(async (req, res) => {
    const playlists = await communityPlaylistService.fetchCommunityPlaylists();

    // Store count for activity logging (sum all playlists across categories)
    res.locals.playlistCount = playlists.categories.reduce(
      (total, category) => total + category.playlists.length,
      0
    );

    res.json(playlists);
  })
);

// POST /api/community-playlists/download - Download a specific playlist
router.post(
  '/download',
  optionalAuth,
  logActivity('playlists.community.download', 'community_playlists', (req, res) => ({
    downloadUrl: req.body.downloadUrl,
    playlistTitle: res.locals.playlistTitle || null,
    playlistId: res.locals.playlistId || null,
    gameCount: res.locals.gameCount || 0,
  })),
  asyncHandler(async (req, res) => {
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

    // Store metadata for activity logging
    res.locals.playlistTitle = result.playlist?.title;
    res.locals.playlistId = result.playlist?.id;
    res.locals.gameCount = result.playlist?.games?.length || 0;

    res.status(201).json(result.playlist);
  })
);

export default router;
