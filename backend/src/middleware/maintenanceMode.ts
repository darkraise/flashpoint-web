import { Request, Response, NextFunction } from 'express';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { logger } from '../utils/logger';

// Singleton instance - shared across all requests
const systemSettings = new CachedSystemSettingsService();

// MINIMAL whitelist - only endpoints needed for admin to LOGIN
// Everything else requires admin authentication
const MINIMAL_PUBLIC_PATHS = [
  '/health',                    // Health checks for monitoring
  '/api/auth/login',            // Admin needs to login
  '/api/auth/refresh',          // Token refresh
  '/api/settings/public',       // UI needs public settings
  '/proxy',                     // Game images, logos, screenshots, and game files
  '/api/playlists/shared',      // Anonymous shared playlist access (bypasses guest access settings)
];

/**
 * Maintenance mode middleware - SIMPLIFIED VERSION
 *
 * Prerequisites:
 * - softAuth middleware MUST be applied globally before this middleware
 * - softAuth populates req.user with user data if valid token exists
 *
 * When maintenance mode is ON:
 * - Admin users (with 'settings.update' permission) can access EVERYTHING
 * - Non-admin users are blocked from EVERYTHING except minimal public paths
 * - Guests are blocked from EVERYTHING except minimal public paths
 *
 * Strategy:
 * 1. Allow minimal public paths (login, health, etc.)
 * 2. Check if maintenance mode enabled
 * 3. If enabled: only allow admins through, block everyone else
 * 4. If disabled: allow everyone (normal operation)
 */
export async function maintenanceMode(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  try {
    // Step 1: Check if path is in minimal public whitelist
    // These paths must work for admin to LOGIN during maintenance
    const isPublicPath = MINIMAL_PUBLIC_PATHS.some(path =>
      req.path === path || req.path.startsWith(path + '/')
    );

    if (isPublicPath) {
      return next(); // Allow public paths for everyone
    }

    // Step 2: Check if maintenance mode is enabled
    const appSettings = systemSettings.getCategory('app');
    const isMaintenanceEnabled = appSettings.maintenanceMode === true;

    if (!isMaintenanceEnabled) {
      return next(); // Normal operation - allow everyone
    }

    // Step 3: Maintenance mode is ON - check if user is admin
    // req.user is populated by softAuth middleware (applied globally before this)
    const user = req.user;
    const isAdmin = user?.permissions?.includes('settings.update');

    // Debug logging to help diagnose permission issues
    if (user) {
      logger.debug(
        `[Maintenance] User ${user.username} (role: ${user.role}) - permissions: ${user.permissions?.join(', ') || 'none'}`
      );
    } else {
      logger.debug('[Maintenance] No user found in request (unauthenticated)');
    }

    if (isAdmin) {
      // Admin user - ALLOW EVERYTHING (all endpoints, all features)
      // user is guaranteed to exist if isAdmin is true
      logger.info(
        `[Maintenance] Admin ${user!.username} accessing ${req.method} ${req.path}`
      );
      return next();
    }

    // Step 4: Non-admin user or guest - BLOCK EVERYTHING
    const userInfo = user ? `user ${user.username}` : 'unauthenticated user';
    logger.warn(
      `[Maintenance] Blocked ${req.method} ${req.path} from ${userInfo} (IP: ${req.ip})`
    );

    return res.status(503)
      .set('Retry-After', '3600')
      .json({
        error: 'Service Unavailable',
        message: 'The application is currently undergoing maintenance. Please try again later.',
        maintenanceMode: true,
        retryAfter: 3600,
      });

  } catch (error) {
    logger.error('[Maintenance] Critical error in maintenance middleware:', error);

    // FAIL CLOSED - Block requests on error (secure by default)
    // This is the opposite of the previous behavior
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'System maintenance in progress',
      maintenanceMode: true,
    });
  }
}
