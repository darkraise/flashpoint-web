import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some((permission) => userPermissions.includes(permission));

    if (!hasPermission) {
      return next(new AppError(403, 'Insufficient permissions'));
    }

    next();
  };
};

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
