import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from './errorHandler';
import { verifySharedAccessToken, SharedAccessPayload } from '../utils/jwt';
import { UserPlaylistService } from '../services/UserPlaylistService';
import { asyncHandler } from './asyncHandler';

const authService = new AuthService();
const playlistService = new UserPlaylistService();

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
 * Requires valid token in Authorization header
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided', true, 'NO_TOKEN');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token and get user
    const user = await authService.verifyAccessToken(token);
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - allows guest access if enabled
 * If token is provided, verifies it. Otherwise, sets guest user (if guest access enabled)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token provided - verify it
      const token = authHeader.substring(7);
      const user = await authService.verifyAccessToken(token);
      req.user = user;
    } else {
      // No token - check if guest access is enabled
      if (!authService.isGuestAccessEnabled()) {
        throw new AppError(401, 'Authentication required', true, 'AUTH_REQUIRED');
      }

      // Set guest user with read-only permissions
      req.user = {
        id: 0,
        username: 'guest',
        email: '',
        role: 'guest',
        permissions: ['games.read', 'playlists.read'],
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Soft authentication - populates req.user if token exists, otherwise leaves undefined
 * Does NOT throw errors - just silently sets req.user or leaves it undefined
 * Used for middleware that needs to check user identity but doesn't require auth
 * Perfect for maintenance mode checks that need to identify admins without blocking others
 */
export const softAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token provided - try to verify it
      const token = authHeader.substring(7);
      try {
        const user = await authService.verifyAccessToken(token);
        req.user = user;
      } catch (error) {
        // Invalid/expired token - just leave req.user undefined
        req.user = undefined;
      }
    } else {
      // No token - leave req.user undefined
      req.user = undefined;
    }

    next(); // Always continue, never throw errors
  } catch (error) {
    // Unexpected error - continue anyway with undefined user
    req.user = undefined;
    next();
  }
};

/**
 * Middleware that handles both regular authentication and shared access tokens
 * Order: 1) Regular JWT Bearer token -> req.user
 *        2) Shared access token (SharedAccess prefix) -> req.sharedAccess
 *        3) Guest access (if enabled) -> req.user (guest)
 */
export const sharedAccessAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      // Check for shared access token first
      if (authHeader.startsWith('SharedAccess ')) {
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

          req.sharedAccess = payload;
          return next();
        } catch (error) {
          if (error instanceof AppError) throw error;
          throw new AppError(401, 'Invalid shared access token', true, 'SHARED_ACCESS_INVALID');
        }
      }

      // Check for regular JWT token
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = await authService.verifyAccessToken(token);
        req.user = user;
        return next();
      }
    }

    // No valid token - check guest access
    if (!authService.isGuestAccessEnabled()) {
      throw new AppError(401, 'Authentication required', true, 'AUTH_REQUIRED');
    }

    // Set guest user
    req.user = {
      id: 0,
      username: 'guest',
      email: '',
      role: 'guest',
      permissions: ['games.read', 'playlists.read', 'games.play'],
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
    // If regular user auth, skip validation
    if (req.user) {
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

    throw new AppError(401, 'Authentication required', true, 'AUTH_REQUIRED');
  });
};
