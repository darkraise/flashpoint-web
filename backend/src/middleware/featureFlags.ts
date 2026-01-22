import { Request, Response, NextFunction } from 'express';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

const systemSettings = new CachedSystemSettingsService();

/**
 * Middleware to check if a feature is enabled
 * Admins with settings.update permission bypass feature flag checks
 * @param featureKey - The feature flag key (e.g., 'enablePlaylists')
 * @returns Middleware function
 */
export function requireFeature(featureKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Admins bypass feature flag checks
      if (req.user?.permissions?.includes('settings.update')) {
        logger.debug(
          `[FeatureFlag] Admin '${req.user.username}' bypassing feature flag check for '${featureKey}'`
        );
        return next();
      }

      const features = systemSettings.getCategory('features');
      const isEnabled = features[featureKey];

      if (isEnabled === false) {
        logger.warn(
          `[FeatureFlag] Feature '${featureKey}' is disabled, blocked ${req.method} ${req.path} from ${req.user?.username || 'guest'} (IP: ${req.ip})`
        );
        throw new AppError(403, `This feature is currently disabled. Please contact your administrator.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if a feature is enabled (for use in route handlers or services)
 * @param featureKey - The feature flag key (e.g., 'enablePlaylists')
 * @returns boolean
 */
export function isFeatureEnabled(featureKey: string): boolean {
  try {
    const features = systemSettings.getCategory('features');
    return features[featureKey] !== false;
  } catch (error) {
    logger.error('[FeatureFlag] Error checking feature flag:', error);
    return true; // Default to enabled on error
  }
}
