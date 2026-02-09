import { Router } from 'express';
import { z } from 'zod';
import {
  CommunityPlaylistService,
  ALLOWED_DOWNLOAD_DOMAINS,
} from '../services/CommunityPlaylistService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { optionalAuth, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const communityPlaylistService = new CommunityPlaylistService();

const downloadSchema = z.object({
  downloadUrl: z.string().url().max(2000),
});

router.get(
  '/',
  optionalAuth,
  logActivity('playlists.community.browse', 'community_playlists', (req, res) => ({
    playlistCount: res.locals.playlistCount || 0,
  })),
  asyncHandler(async (req, res) => {
    const playlists = await communityPlaylistService.fetchCommunityPlaylists();

    res.locals.playlistCount = playlists.categories.reduce(
      (total, category) => total + category.playlists.length,
      0
    );

    res.json(playlists);
  })
);

router.post(
  '/download',
  authenticate,
  requirePermission('playlists.create'),
  logActivity('playlists.community.download', 'community_playlists', (req, res) => ({
    downloadUrl: req.body.downloadUrl,
    playlistTitle: res.locals.playlistTitle || null,
    playlistId: res.locals.playlistId || null,
    gameCount: res.locals.gameCount || 0,
  })),
  asyncHandler(async (req, res) => {
    const { downloadUrl } = downloadSchema.parse(req.body);

    try {
      const parsedUrl = new URL(downloadUrl);
      const isAllowed = ALLOWED_DOWNLOAD_DOMAINS.some(
        (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      );
      if (!isAllowed) {
        throw new AppError(400, 'Download URL domain not allowed');
      }
      if (parsedUrl.protocol !== 'https:') {
        throw new AppError(400, 'Only HTTPS URLs are allowed');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Invalid URL');
    }

    const result = await communityPlaylistService.downloadPlaylist(downloadUrl);

    if (!result.success) {
      if (result.conflict) {
        throw new AppError(409, 'A playlist with this ID already exists');
      }
      throw new AppError(500, 'Failed to download playlist');
    }

    res.locals.playlistTitle = result.playlist?.title;
    res.locals.playlistId = result.playlist?.id;
    res.locals.gameCount = result.playlist?.games?.length || 0;

    res.status(201).json(result.playlist);
  })
);

export default router;
