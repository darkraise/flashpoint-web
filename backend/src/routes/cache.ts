import { Router } from 'express';
import { GameSearchCache } from '../services/GameSearchCache';
import { PermissionCache } from '../services/PermissionCache';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * GET /api/cache/stats
 * Get cache statistics
 * Requires: settings.view permission
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const gameSearchStats = GameSearchCache.getStats();

    res.json({
      gameSearch: {
        size: gameSearchStats.size,
        max: gameSearchStats.max,
        ttl: gameSearchStats.ttl,
        hitRate: gameSearchStats.size > 0 ? 'active' : 'idle'
      },
      permissions: {
        enabled: true,
        ttl: '5 minutes',
        note: 'Permission cache size not exposed'
      }
    });
  })
);

/**
 * POST /api/cache/clear
 * Clear all caches
 * Requires: settings.update permission
 */
router.post(
  '/clear',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const { cacheType } = req.body;

    const results: Record<string, boolean> = {};

    if (!cacheType || cacheType === 'gameSearch') {
      GameSearchCache.clearCache();
      results.gameSearch = true;
    }

    if (!cacheType || cacheType === 'permissions') {
      PermissionCache.clearAll();
      results.permissions = true;
    }

    if (!cacheType || cacheType === 'all') {
      GameSearchCache.clearCache();
      PermissionCache.clearAll();
      results.gameSearch = true;
      results.permissions = true;
    }

    res.json({
      message: 'Cache cleared successfully',
      cleared: results
    });
  })
);

export default router;
