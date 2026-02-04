import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { DomainService } from '../services/DomainService';
import { PermissionCache } from '../services/PermissionCache';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { JobScheduler } from '../services/JobScheduler';
import { logger } from '../utils/logger';

const router = Router();
const systemSettings = new CachedSystemSettingsService();
const domainService = DomainService.getInstance();

// Helper function to update job scheduler when jobs settings change
function updateJobScheduler(category: string, settings: Record<string, any>): void {
  if (category === 'jobs') {
    // Update metadata sync job if its settings changed
    if ('metadataSyncEnabled' in settings || 'metadataSyncSchedule' in settings) {
      const currentSettings = systemSettings.getCategory('jobs');
      const enabled = settings.metadataSyncEnabled ?? currentSettings.metadataSyncEnabled ?? false;
      const cronSchedule =
        settings.metadataSyncSchedule ?? currentSettings.metadataSyncSchedule ?? '0 * * * *';

      JobScheduler.updateJob('metadata-sync', {
        enabled,
        cronSchedule,
      });
    }
  }
}

// ===================================
// GET ALL SETTINGS (Admin Only)
// ===================================
router.get(
  '/',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.list', 'system_settings'),
  async (req: Request, res: Response) => {
    try {
      const allSettings = systemSettings.getAll();
      res.json(allSettings);
    } catch (error) {
      logger.error('Failed to get all settings:', error);
      res.status(500).json({
        error: { message: 'Failed to retrieve settings' },
      });
    }
  }
);

// ===================================
// GET PUBLIC SETTINGS (No Auth Required)
// ===================================
router.get('/public', async (req: Request, res: Response) => {
  try {
    const publicSettings: Record<
      string,
      Record<string, unknown>
    > = systemSettings.getPublicSettings();

    // Add environment-based config values to public settings
    if (!publicSettings.app) {
      publicSettings.app = {};
    }
    publicSettings.app.homeRecentHours = config.homeRecentHours;

    // Inject edition/version from config (auto-detected from version.txt, not stored in DB)
    if (!publicSettings.metadata) {
      publicSettings.metadata = {};
    }
    publicSettings.metadata.flashpointEdition = config.flashpointEdition;
    publicSettings.metadata.flashpointVersion = config.flashpointVersionString;

    // Inject default domain from domains table
    try {
      publicSettings.domains = {
        defaultDomain: domainService.getDefaultDomain(),
      };
    } catch (error) {
      logger.debug('[PublicSettings] Failed to fetch default domain:', error);
      publicSettings.domains = { defaultDomain: null };
    }

    res.json(publicSettings);
  } catch (error) {
    logger.error('Failed to get public settings:', error);
    res.status(500).json({
      error: { message: 'Failed to retrieve public settings' },
    });
  }
});

// ===================================
// GET CATEGORY SETTINGS (Admin Only)
// ===================================
router.get(
  '/:category',
  authenticate,
  requirePermission('settings.read'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const categorySettings = systemSettings.getCategory(category);

      // Return settings (empty object if category has no settings yet)
      res.json(categorySettings);
    } catch (error) {
      logger.error(`Failed to get ${req.params.category} settings:`, error);
      res.status(500).json({
        error: { message: 'Failed to retrieve settings' },
      });
    }
  }
);

// ===================================
// UPDATE CATEGORY SETTINGS (Admin Only)
// ===================================
const updateCategorySchema = z.record(z.any());

router.patch(
  '/:category',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'system_settings'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const validation = updateCategorySchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const settings = validation.data;
      const userId = req.user!.id;

      // Update settings (validation happens in service)
      systemSettings.updateCategory(category, settings, userId);

      // Update job scheduler if jobs settings changed
      updateJobScheduler(category, settings);

      // Return updated settings
      const updated = systemSettings.getCategory(category);
      res.json(updated);
    } catch (error) {
      logger.error(`Failed to update ${req.params.category} settings:`, error);

      // Check if it's a validation error
      if (error instanceof Error && error.message.includes('must be')) {
        return res.status(400).json({
          error: { message: error.message },
        });
      }

      res.status(500).json({
        error: { message: 'Failed to update settings' },
      });
    }
  }
);

// ===================================
// GET SINGLE SETTING (Admin Only)
// ===================================
router.get(
  '/:category/:key',
  authenticate,
  requirePermission('settings.read'),
  async (req: Request, res: Response) => {
    try {
      const { category, key } = req.params;
      const fullKey = `${category}.${key}`;
      const value = systemSettings.get(fullKey);

      if (value === null) {
        return res.status(404).json({
          error: { message: `Setting '${fullKey}' not found` },
        });
      }

      res.json({ value });
    } catch (error) {
      logger.error(`Failed to get setting ${req.params.category}.${req.params.key}:`, error);
      res.status(500).json({
        error: { message: 'Failed to retrieve setting' },
      });
    }
  }
);

// ===================================
// UPDATE SINGLE SETTING (Admin Only)
// ===================================
const updateSettingSchema = z.object({
  value: z.any(),
});

router.patch(
  '/:category/:key',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'system_settings'),
  async (req: Request, res: Response) => {
    try {
      const { category, key } = req.params;
      const fullKey = `${category}.${key}`;
      const validation = updateSettingSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: {
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const { value } = validation.data;
      const userId = req.user!.id;

      // Update setting (validation happens in service)
      systemSettings.set(fullKey, value, userId);

      // Return updated value
      const updated = systemSettings.get(fullKey);
      res.json({ value: updated });
    } catch (error) {
      logger.error(`Failed to update setting ${req.params.category}.${req.params.key}:`, error);

      // Check if it's a validation error
      if (error instanceof Error && error.message.includes('must be')) {
        return res.status(400).json({
          error: { message: error.message },
        });
      }

      res.status(500).json({
        error: { message: 'Failed to update setting' },
      });
    }
  }
);

// ===================================
// GET CACHE STATISTICS (Admin Only)
// ===================================
router.get(
  '/_cache/stats',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const stats = systemSettings.getCacheStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      res.status(500).json({
        error: { message: 'Failed to retrieve cache statistics' },
      });
    }
  }
);

// ===================================
// CLEAR CACHE (Admin Only)
// ===================================
router.post(
  '/_cache/clear',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.cache_clear', 'system_settings'),
  async (req: Request, res: Response) => {
    try {
      const { category } = req.body;

      if (category) {
        systemSettings.clearCategoryCache(category);
      } else {
        systemSettings.clearCache();
      }

      res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      res.status(500).json({
        error: { message: 'Failed to clear cache' },
      });
    }
  }
);

// ===================================
// GET PERMISSION CACHE STATISTICS (Admin Only)
// ===================================
router.get(
  '/_cache/permissions/stats',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const stats = PermissionCache.getStats();
      res.json({
        ...stats,
        description: {
          userCacheSize: 'Number of cached user permissions',
          roleCacheSize: 'Number of cached role permissions',
          totalSize: 'Total cached entries',
          ttl: {
            userPermissions: '5 minutes',
            rolePermissions: '10 minutes',
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get permission cache stats:', error);
      res.status(500).json({
        error: { message: 'Failed to retrieve permission cache statistics' },
      });
    }
  }
);

// ===================================
// CLEAR PERMISSION CACHE (Admin Only)
// ===================================
router.post(
  '/_cache/permissions/clear',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.permission_cache_clear', 'system_settings'),
  async (req: Request, res: Response) => {
    try {
      const { type, id } = req.body;

      if (type === 'user' && id) {
        PermissionCache.invalidateUser(Number(id));
        res.json({ message: `User ${id} permission cache cleared successfully` });
      } else if (type === 'role' && id) {
        PermissionCache.invalidateRole(Number(id));
        res.json({ message: `Role ${id} permission cache cleared successfully` });
      } else if (type === 'users') {
        PermissionCache.invalidateAllUsers();
        res.json({ message: 'All user permission caches cleared successfully' });
      } else if (type === 'roles') {
        PermissionCache.invalidateAllRoles();
        res.json({ message: 'All role permission caches cleared successfully' });
      } else if (type === 'all') {
        PermissionCache.clearAll();
        res.json({ message: 'All permission caches cleared successfully' });
      } else {
        res.status(400).json({
          error: {
            message:
              'Invalid request. Specify type: "user", "role", "users", "roles", or "all". For "user" or "role", provide an id.',
          },
        });
      }
    } catch (error) {
      logger.error('Failed to clear permission cache:', error);
      res.status(500).json({
        error: { message: 'Failed to clear permission cache' },
      });
    }
  }
);

export default router;
