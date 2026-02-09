import { Router } from 'express';
import { PerformanceMetrics } from '../services/PerformanceMetrics';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

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
