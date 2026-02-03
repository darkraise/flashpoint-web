import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Check if user has required permission
 * User must have at least one of the specified permissions
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has any of the required permissions
    const hasPermission = permissions.some((permission) => userPermissions.includes(permission));

    if (!hasPermission) {
      return next(new AppError(403, 'Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user has required role
 * User must have one of the specified roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient role'));
    }

    next();
  };
};
