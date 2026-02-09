import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { asyncHandler } from './asyncHandler';
import { UserPlaylistService, UserPlaylist } from '../services/UserPlaylistService';

const playlistService = new UserPlaylistService();

declare global {
  namespace Express {
    interface Request {
      sharedPlaylist?: UserPlaylist;
    }
  }
}

/**
 * Validates share token and attaches playlist to req.sharedPlaylist.
 * Does NOT require authentication - bypasses guest access settings.
 * Returns 404 (not 403) to avoid leaking token validity.
 */
export const validateSharedPlaylist = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { shareToken } = req.params;

    if (!shareToken) {
      throw new AppError(400, 'Share token required');
    }

    // Validate UUID v4 format to avoid unnecessary DB queries
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(shareToken)) {
      throw new AppError(400, 'Invalid share token format');
    }

    const playlist = playlistService.getPlaylistByShareToken(shareToken);

    if (!playlist) {
      throw new AppError(404, 'Shared playlist not found or no longer available');
    }

    req.sharedPlaylist = playlist;
    next();
  }
);
