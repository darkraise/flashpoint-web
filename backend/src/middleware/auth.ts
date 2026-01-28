import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from './errorHandler';

const authService = new AuthService();

/**
 * Authenticate user from JWT token
 * Requires valid token in Authorization header
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
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
        throw new AppError(401, 'Authentication required');
      }

      // Set guest user with read-only permissions
      req.user = {
        id: 0,
        username: 'guest',
        email: '',
        role: 'guest',
        permissions: ['games.read', 'playlists.read']
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
