import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { asyncHandler } from './asyncHandler';
import { UserPlaylistService, UserPlaylist } from '../services/UserPlaylistService';

const playlistService = new UserPlaylistService();

// Extend Express Request type to include sharedPlaylist
declare global {
  namespace Express {
    interface Request {
      sharedPlaylist?: UserPlaylist;
    }
  }
}

/**
 * Validates share token and attaches playlist to req.sharedPlaylist
 * Does NOT require authentication - bypasses guest access settings
 *
 * Flow:
 * 1. Extract shareToken from route params
 * 2. Validate UUID format (prevent DB query for junk tokens)
 * 3. Query database: WHERE share_token = ? AND is_public = 1 AND expiry valid
 * 4. If valid → attach to req.sharedPlaylist
 * 5. If invalid → throw 404 (don't leak existence)
 */
export const validateSharedPlaylist = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { shareToken } = req.params;

    if (!shareToken) {
      throw new AppError(400, 'Share token required');
    }

    // Validate UUID format (prevent DB query for junk tokens)
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(shareToken)) {
      throw new AppError(400, 'Invalid share token format');
    }

    // Get playlist (checks is_public and expiry)
    const playlist = playlistService.getPlaylistByShareToken(shareToken);

    if (!playlist) {
      // Return 404 (not 403) to avoid leaking token validity
      throw new AppError(404, 'Shared playlist not found or no longer available');
    }

    // Attach to request for route handler
    req.sharedPlaylist = playlist;
    next();
  }
);
