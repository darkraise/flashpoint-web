import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from './errorHandler';
import { verifySharedAccessToken, SharedAccessPayload } from '../utils/jwt';
import { UserPlaylistService } from '../services/UserPlaylistService';
import { asyncHandler } from './asyncHandler';
import { getAccessTokenFromCookie } from '../utils/cookies';

const authService = new AuthService();
const playlistService = new UserPlaylistService();

/**
 * Extract access token from HTTP-only cookie or Authorization header.
 * Cookie takes priority (regular authenticated user).
 */
function getAccessToken(req: Request): string | undefined {
  const cookieToken = getAccessTokenFromCookie(req.cookies);
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
}

/**
 * Extend Express Request to include sharedAccess property
 */
declare global {
  namespace Express {
    interface Request {
      sharedAccess?: SharedAccessPayload;
    }
  }
}

/**
 * Authenticate user from JWT token
 * Reads access token from HTTP-only cookie first, falls back to Authorization header
 */
export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = getAccessToken(req);
    if (!token) {
      throw new AppError(401, 'No token provided', true, 'NO_TOKEN');
    }

    const user = await authService.verifyAccessToken(token);
    req.user = user;

    next();
  }
);

/**
 * Optional authentication - allows guest access if enabled
 * Reads token from cookie or header. If absent, sets guest user (if guest access enabled)
 */
export const optionalAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = getAccessToken(req);

    if (token) {
      const user = await authService.verifyAccessToken(token);
      req.user = user;
    } else {
      // No token - check if guest access is enabled
      if (!authService.isGuestAccessEnabled()) {
        throw new AppError(401, 'Authentication required', true, 'AUTH_REQUIRED');
      }

      // Guest users get no permissions - they can only browse, not play
      // (authentication is required for games.play permission)
      req.user = {
        id: 0,
        username: 'guest',
        email: '',
        role: 'guest',
        permissions: ['games.read', 'playlists.read'],
      };
    }

    next();
  }
);

/**
 * Soft authentication - populates req.user if token exists, otherwise leaves undefined
 * Does NOT throw errors - just silently sets req.user or leaves it undefined
 * Reads token from cookie or header. Perfect for maintenance mode checks.
 */
export const softAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAccessToken(req);

    if (token) {
      try {
        const user = await authService.verifyAccessToken(token);
        req.user = user;
      } catch {
        // Invalid/expired token - just leave req.user undefined
        req.user = undefined;
      }
    } else {
      req.user = undefined;
    }

    next(); // Always continue, never throw errors
  } catch {
    // Unexpected error - continue anyway with undefined user
    req.user = undefined;
    next();
  }
};

/**
 * Middleware that handles both regular authentication and shared access tokens
 * Order: 1) Regular JWT (cookie or Bearer header) -> req.user
 *        2) Shared access token (SharedAccess header) -> req.sharedAccess
 *        3) Guest access (if enabled) -> req.user (guest)
 */
export const sharedAccessAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check regular auth (cookie or Bearer header)
    const accessToken = getAccessToken(req);
    if (accessToken) {
      const user = await authService.verifyAccessToken(accessToken);
      req.user = user;
      return next();
    }

    // 2. Check for shared access token (Authorization header only)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('SharedAccess ')) {
      const token = authHeader.substring(13);
      try {
        const payload = verifySharedAccessToken(token);

        // Validate the shareToken is still valid
        const playlist = playlistService.getPlaylistByShareToken(payload.shareToken);
        if (!playlist) {
          throw new AppError(
            401,
            'Shared access token invalid or expired',
            true,
            'SHARED_ACCESS_INVALID'
          );
        }

        // Grant games.play permission for valid shared access tokens
        req.sharedAccess = payload;
        req.user = {
          id: 0,
          username: 'shared-guest',
          email: '',
          role: 'guest',
          permissions: ['games.read', 'playlists.read', 'games.play'],
        };
        return next();
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(401, 'Invalid shared access token', true, 'SHARED_ACCESS_INVALID');
      }
    }

    // 3. No valid token - check guest access
    if (!authService.isGuestAccessEnabled()) {
      throw new AppError(401, 'Authentication required', true, 'AUTH_REQUIRED');
    }

    // Guest users without a shared access token can only browse, not play
    req.user = {
      id: 0,
      username: 'guest',
      email: '',
      role: 'guest',
      permissions: ['games.read', 'playlists.read'],
    };

    next();
  }
);

/**
 * Validates that a game is accessible via shared access token
 * Must be used after sharedAccessAuth middleware
 */
export const validateSharedGameAccess = (gameIdParam: string = 'id') => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // If regular user auth (non-zero ID), skip validation
    if (req.user && req.user.id !== 0) {
      return next();
    }

    // If shared access, validate game is in playlist
    if (req.sharedAccess) {
      const gameId = req.params[gameIdParam];
      if (!gameId) {
        throw new AppError(400, 'Game ID required');
      }

      const isInPlaylist = playlistService.isGameInSharedPlaylist(
        req.sharedAccess.shareToken,
        gameId
      );

      if (!isInPlaylist) {
        throw new AppError(
          403,
          'Game not accessible via this shared playlist',
          true,
          'GAME_NOT_IN_SHARED_PLAYLIST'
        );
      }

      return next();
    }

    // Guest users (id=0, no sharedAccess) can view game details in read-only mode
    if (req.user && req.user.id === 0 && req.user.permissions?.includes('games.read')) {
      return next();
    }

    throw new AppError(401, 'Authentication required', true, 'AUTH_REQUIRED');
  });
};
