import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

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
