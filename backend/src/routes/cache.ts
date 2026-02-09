import { Router } from 'express';
import { GameSearchCache } from '../services/GameSearchCache';
import { PermissionCache } from '../services/PermissionCache';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get(
  '/stats',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const gameSearchStats = GameSearchCache.getStats();

    res.json({
      gameSearch: {
        size: gameSearchStats.primary.size,
        max: gameSearchStats.primary.max,
        ttl: gameSearchStats.primary.ttl,
        hitRate: gameSearchStats.primary.size > 0 ? 'active' : 'idle',
      },
      permissions: {
        enabled: true,
        ttl: '5 minutes',
        note: 'Permission cache size not exposed',
      },
    });
  })
);

router.post(
  '/clear',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const { cacheType } = req.body;

    const validCacheTypes = ['gameSearch', 'permissions', 'all'];
    if (cacheType && !validCacheTypes.includes(cacheType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cacheType. Must be one of: gameSearch, permissions, all',
      });
    }

    const results: Record<string, boolean> = {};

    // Use switch to fix mutually exclusive cache clearing logic
    switch (cacheType) {
      case 'gameSearch':
        GameSearchCache.clearCache();
        results.gameSearch = true;
        break;
      case 'permissions':
        PermissionCache.clearAll();
        results.permissions = true;
        break;
      default:
        // Clear all caches when cacheType is 'all' or undefined
        GameSearchCache.clearCache();
        PermissionCache.clearAll();
        results.gameSearch = true;
        results.permissions = true;
        break;
    }

    res.json({
      message: 'Cache cleared successfully',
      cleared: results,
    });
  })
);

export default router;
