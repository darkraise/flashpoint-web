import { Router } from 'express';
import { ActivityService } from '../services/ActivityService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';

const router = Router();
const activityService = new ActivityService();

// Apply feature flag check to all routes in this router
router.use(requireFeature('enableStatistics'));

/**
 * GET /api/activities
 * List activity logs with pagination and filters
 */
router.get(
  '/',
  authenticate,
  requirePermission('activities.read'),
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Optional filters
      const filters: any = {};
      if (req.query.userId) {
        filters.userId = parseInt(req.query.userId as string);
      }
      if (req.query.username) {
        filters.username = req.query.username as string;
      }
      if (req.query.action) {
        filters.action = req.query.action as string;
      }
      if (req.query.resource) {
        filters.resource = req.query.resource as string;
      }
      if (req.query.startDate) {
        filters.startDate = req.query.startDate as string;
      }
      if (req.query.endDate) {
        filters.endDate = req.query.endDate as string;
      }

      // Validate date range
      if (filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
        }

        if (endDate < startDate) {
          return res.status(400).json({
            success: false,
            error: 'End date must be after or equal to start date'
          });
        }
      }

      const result = await activityService.getLogs(page, limit, filters);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities/stats
 * Get aggregate statistics for dashboard
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('activities.read'),
  async (req, res, next) => {
    try {
      const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || '24h';
      const customRange = req.query.startDate && req.query.endDate
        ? {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string
          }
        : undefined;

      const stats = await activityService.getStats(timeRange, customRange);

      res.json({
        success: true,
        data: stats,
        meta: {
          calculatedAt: new Date().toISOString(),
          timeRange
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities/trend
 * Get activity trend over time
 */
router.get(
  '/trend',
  authenticate,
  requirePermission('activities.read'),
  async (req, res, next) => {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 7, 30);

      const result = await activityService.getTrend(days);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities/top-actions
 * Get top actions by frequency
 */
router.get(
  '/top-actions',
  authenticate,
  requirePermission('activities.read'),
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || '24h';

      const result = await activityService.getTopActions(limit, timeRange);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/activities/breakdown
 * Get activity breakdown by dimension
 */
router.get(
  '/breakdown',
  authenticate,
  requirePermission('activities.read'),
  async (req, res, next) => {
    try {
      const groupBy = (req.query.groupBy as 'resource' | 'user' | 'ip') || 'resource';
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || '24h';

      // Validate groupBy parameter
      if (!['resource', 'user', 'ip'].includes(groupBy)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid groupBy parameter. Must be one of: resource, user, ip'
        });
      }

      const result = await activityService.getBreakdown(groupBy, limit, timeRange);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
