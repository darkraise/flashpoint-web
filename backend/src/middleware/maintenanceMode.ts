import { Request, Response, NextFunction } from 'express';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { logger } from '../utils/logger';

const systemSettings = CachedSystemSettingsService.getInstance();

// Only endpoints needed for admin to LOGIN during maintenance
const MINIMAL_PUBLIC_PATHS = [
  '/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/setup-status',
  '/api/auth/refresh',
  '/api/settings/public',
  '/proxy',
  '/api/playlists/shared',
];

/**
 * Maintenance mode middleware.
 * Requires softAuth to run first (populates req.user).
 * When enabled: admins pass through, everyone else is blocked except MINIMAL_PUBLIC_PATHS.
 */
export async function maintenanceMode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const isPublicPath = MINIMAL_PUBLIC_PATHS.some(
      (path) => req.path === path || req.path.startsWith(path + '/')
    );

    if (isPublicPath) {
      return next();
    }

    const appSettings = systemSettings.getCategory('app');
    const isMaintenanceEnabled = appSettings.maintenanceMode === true;

    if (!isMaintenanceEnabled) {
      return next();
    }

    const user = req.user;
    const isAdmin = user?.permissions?.includes('settings.update');

    if (user) {
      logger.debug(
        `[Maintenance] User ${user.username} (role: ${user.role}) - permissions: ${user.permissions?.join(', ') || 'none'}`
      );
    } else {
      logger.debug('[Maintenance] No user found in request (unauthenticated)');
    }

    if (isAdmin) {
      logger.info(`[Maintenance] Admin ${user!.username} accessing ${req.method} ${req.path}`);
      return next();
    }

    const userInfo = user ? `user ${user.username}` : 'unauthenticated user';
    logger.warn(`[Maintenance] Blocked ${req.method} ${req.path} from ${userInfo} (IP: ${req.ip})`);

    return res.status(503).set('Retry-After', '3600').json({
      error: 'Service Unavailable',
      message: 'The application is currently undergoing maintenance. Please try again later.',
      maintenanceMode: true,
      retryAfter: 3600,
    });
  } catch (error) {
    logger.error('[Maintenance] Critical error in maintenance middleware:', error);

    // FAIL CLOSED - block requests on error (secure by default)
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'System maintenance in progress',
      maintenanceMode: true,
    });
  }
}
