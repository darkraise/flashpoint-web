import { Router, Request, Response } from 'express';
import { z } from 'zod';
import cron from 'node-cron';
import { config } from '../config';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { DomainService } from '../services/DomainService';
import { PermissionCache } from '../services/PermissionCache';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { JobScheduler } from '../services/JobScheduler';
import { logger } from '../utils/logger';
import { CategorySettings } from '../types/settings';

const router = Router();
const systemSettings = CachedSystemSettingsService.getInstance();
const domainService = DomainService.getInstance();

function updateJobScheduler(category: string, settings: CategorySettings): void {
  if (category === 'jobs') {
    if ('metadataSyncEnabled' in settings || 'metadataSyncSchedule' in settings) {
      const currentSettings = systemSettings.getCategory('jobs');
      const enabled = (settings.metadataSyncEnabled ??
        currentSettings.metadataSyncEnabled ??
        false) as boolean;
      const cronSchedule = (settings.metadataSyncSchedule ??
        currentSettings.metadataSyncSchedule ??
        '0 * * * *') as string;

      if (cronSchedule && !cron.validate(cronSchedule)) {
        logger.warn(`[Settings] Invalid cron expression: ${cronSchedule}`);
        return;
      }

      JobScheduler.updateJob('metadata-sync', {
        enabled,
        cronSchedule,
      });
    }

    if ('ruffleUpdateEnabled' in settings || 'ruffleUpdateSchedule' in settings) {
      const currentSettings = systemSettings.getCategory('jobs');
      const enabled = (settings.ruffleUpdateEnabled ??
        currentSettings.ruffleUpdateEnabled ??
        false) as boolean;
      const cronSchedule = (settings.ruffleUpdateSchedule ??
        currentSettings.ruffleUpdateSchedule ??
        '0 0 * * *') as string;

      if (cronSchedule && !cron.validate(cronSchedule)) {
        logger.warn(`[Settings] Invalid cron expression: ${cronSchedule}`);
        return;
      }

      JobScheduler.updateJob('ruffle-update', {
        enabled,
        cronSchedule,
      });
    }
  }
}

router.get(
  '/',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.list', 'system_settings'),
  asyncHandler(async (req: Request, res: Response) => {
    const allSettings = systemSettings.getAll();
    res.json(allSettings);
  })
);

router.get(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const publicSettings: Record<
      string,
      Record<string, unknown>
    > = systemSettings.getPublicSettings();

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
  })
);

router.get(
  '/_cache/stats',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    const stats = systemSettings.getCacheStats();
    res.json(stats);
  })
);

router.post(
  '/_cache/clear',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.cache_clear', 'system_settings'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.body;

    if (category) {
      if (typeof category !== 'string' || !isValidCategory(category)) {
        return res
          .status(400)
          .json({ error: { message: `Invalid settings category: ${category}` } });
      }
      systemSettings.clearCategoryCache(category);
    } else {
      systemSettings.clearCache();
    }

    res.json({ message: 'Cache cleared successfully' });
  })
);

router.get(
  '/_cache/permissions/stats',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
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
  })
);

const clearPermissionCacheSchema = z.object({
  type: z.enum(['all', 'user', 'role', 'users', 'roles']),
  id: z.number().int().positive().optional(),
});

router.post(
  '/_cache/permissions/clear',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.permission_cache_clear', 'system_settings'),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = clearPermissionCacheSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid request body',
          details: validation.error.errors,
        },
      });
    }

    const { type, id } = validation.data;

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
  })
);

const VALID_CATEGORIES = [
  'app',
  'auth',
  'jobs',
  'metadata',
  'theme',
  'features',
  'maintenance',
] as const;

type ValidCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(category: string): category is ValidCategory {
  return VALID_CATEGORIES.includes(category as ValidCategory);
}

router.get(
  '/:category',
  authenticate,
  requirePermission('settings.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;

    if (!isValidCategory(category)) {
      return res.status(400).json({
        error: { message: `Invalid settings category: ${category}` },
      });
    }

    const categorySettings = systemSettings.getCategory(category);

    res.json(categorySettings);
  })
);

const updateCategorySchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())])
);

router.patch(
  '/:category',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'system_settings'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;

    if (!isValidCategory(category)) {
      return res.status(400).json({
        error: { message: `Invalid settings category: ${category}` },
      });
    }

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

    systemSettings.updateCategory(category, settings, userId);
    updateJobScheduler(category, settings);

    const updated = systemSettings.getCategory(category);
    res.json(updated);
  })
);

router.get(
  '/:category/:key',
  authenticate,
  requirePermission('settings.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, key } = req.params;
    if (!isValidCategory(category)) {
      return res.status(400).json({
        error: { message: `Invalid category: ${category}` },
      });
    }
    const fullKey = `${category}.${key}`;
    const value = systemSettings.get(fullKey);

    if (value === null) {
      return res.status(404).json({
        error: { message: `Setting '${fullKey}' not found` },
      });
    }

    res.json({ value });
  })
);

const updateSettingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())]),
});

router.patch(
  '/:category/:key',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'system_settings'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, key } = req.params;
    if (!isValidCategory(category)) {
      return res.status(400).json({
        error: { message: `Invalid category: ${category}` },
      });
    }
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

    systemSettings.set(fullKey, value, userId);

    const updated = systemSettings.get(fullKey);
    res.json({ value: updated });
  })
);

export default router;
