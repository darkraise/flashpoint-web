import { Router } from 'express';
import { PerformanceMetrics } from '../services/PerformanceMetrics';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * GET /api/metrics/summary
 * Get performance metrics summary
 * Requires: settings.view permission
 */
router.get(
  '/summary',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const summary = PerformanceMetrics.getSummary();

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * GET /api/metrics/endpoints
 * Get detailed endpoint statistics
 * Requires: settings.view permission
 */
router.get(
  '/endpoints',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const stats = PerformanceMetrics.getAllEndpointStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/metrics/endpoints/slowest
 * Get slowest endpoints
 * Requires: settings.view permission
 */
router.get(
  '/endpoints/slowest',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const slowest = PerformanceMetrics.getSlowestEndpoints(limit);

    res.json({
      success: true,
      data: slowest,
    });
  })
);

/**
 * GET /api/metrics/caches
 * Get cache hit rates
 * Requires: settings.view permission
 */
router.get(
  '/caches',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const cacheStats = PerformanceMetrics.getCacheStats();

    res.json({
      success: true,
      data: cacheStats,
    });
  })
);

/**
 * GET /api/metrics/queries
 * Get database query statistics
 * Requires: settings.view permission
 */
router.get(
  '/queries',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const queryStats = PerformanceMetrics.getQueryStats();

    res.json({
      success: true,
      data: queryStats,
    });
  })
);

/**
 * POST /api/metrics/reset
 * Reset all metrics
 * Requires: settings.update permission
 */
router.post(
  '/reset',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    PerformanceMetrics.reset();

    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
    });
  })
);

export default router;
