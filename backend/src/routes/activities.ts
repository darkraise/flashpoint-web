import { Router } from 'express';
import { z } from 'zod';
import { ActivityService } from '../services/ActivityService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireFeature } from '../middleware/featureFlags';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateDateRange } from '../middleware/dateValidation';

const router = Router();
const activityService = new ActivityService();

// Pagination and limit constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const MAX_ACTIONS_LIMIT = 50;
const MAX_BREAKDOWN_LIMIT = 50;
const DEFAULT_TREND_DAYS = 7;
const MAX_TREND_DAYS = 30;
const DEFAULT_TIME_RANGE = '24h' as const;

// Validation schema for activity query parameters
const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_LIMIT),
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
  validateDateRange(),
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
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || DEFAULT_TIME_RANGE;
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
    const days = Math.min(parseInt(req.query.days as string) || DEFAULT_TREND_DAYS, MAX_TREND_DAYS);

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
    const limit = Math.min(parseInt(req.query.limit as string) || 10, MAX_ACTIONS_LIMIT);
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || DEFAULT_TIME_RANGE;

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
    const limit = Math.min(parseInt(req.query.limit as string) || 10, MAX_BREAKDOWN_LIMIT);
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || DEFAULT_TIME_RANGE;

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
