import { Router } from 'express';
import { z } from 'zod';
import { ActivityService } from '../services/ActivityService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const activityService = new ActivityService();

// Validation schema for activity query parameters
const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  userId: z.coerce.number().int().optional(),
  username: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'username', 'action', 'resource', 'ipAddress']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

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
  asyncHandler(async (req, res) => {
    // Validate and parse query parameters
    const queryResult = activityQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryResult.error.errors
      });
    }

    const { page, limit, userId, username, action, resource, startDate, endDate, sortBy, sortOrder } = queryResult.data;

    // Build filters object
    const filters: any = {};
    if (userId !== undefined) filters.userId = userId;
    if (username) filters.username = username;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Validate date range
    if (filters.startDate && filters.endDate) {
      const startDateObj = new Date(filters.startDate);
      const endDateObj = new Date(filters.endDate);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }

      if (endDateObj < startDateObj) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after or equal to start date'
        });
      }
    }

    const result = await activityService.getLogs(page, limit, filters, sortBy, sortOrder);

    res.json(result);
  })
);

/**
 * GET /api/activities/stats
 * Get aggregate statistics for dashboard
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * GET /api/activities/trend
 * Get activity trend over time
 */
router.get(
  '/trend',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);

    const result = await activityService.getTrend(days);

    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * GET /api/activities/top-actions
 * Get top actions by frequency
 */
router.get(
  '/top-actions',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || '24h';

    const result = await activityService.getTopActions(limit, timeRange);

    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * GET /api/activities/breakdown
 * Get activity breakdown by dimension
 */
router.get(
  '/breakdown',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
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
  })
);

export default router;
