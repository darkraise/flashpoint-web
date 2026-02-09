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

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const MAX_ACTIONS_LIMIT = 50;
const MAX_BREAKDOWN_LIMIT = 50;
const DEFAULT_TREND_DAYS = 7;
const MAX_TREND_DAYS = 30;
const DEFAULT_TIME_RANGE = '24h' as const;

const VALID_TIME_RANGES = ['24h', '7d', '30d'] as const;
type TimeRange = (typeof VALID_TIME_RANGES)[number];

function parseTimeRange(raw: string | undefined): TimeRange | { error: string } {
  if (raw && !VALID_TIME_RANGES.includes(raw as TimeRange)) {
    return { error: 'Invalid timeRange. Must be 24h, 7d, or 30d' };
  }
  return (raw as TimeRange) ?? DEFAULT_TIME_RANGE;
}

const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_LIMIT),
  userId: z.coerce.number().int().optional(),
  username: z.string().optional(),
  action: z.string().max(200).optional(),
  resource: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'username', 'action', 'resource', 'ipAddress']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

router.use(requireFeature('enableStatistics'));

router.get(
  '/',
  authenticate,
  requirePermission('activities.read'),
  validateDateRange(),
  asyncHandler(async (req, res) => {
    const queryResult = activityQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: queryResult.error.errors,
      });
    }

    const {
      page,
      limit,
      userId,
      username,
      action,
      resource,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = queryResult.data;

    const filters: {
      userId?: number;
      username?: string;
      action?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
    } = {};
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

router.get(
  '/stats',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
    const timeRangeResult = parseTimeRange(req.query.timeRange as string | undefined);
    if (typeof timeRangeResult === 'object' && 'error' in timeRangeResult) {
      return res.status(400).json({
        success: false,
        error: timeRangeResult.error,
      });
    }
    const timeRange = timeRangeResult;

    // Validate customRange date strings if provided
    let customRange: { startDate: string; endDate: string } | undefined;
    if (req.query.startDate && req.query.endDate) {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Must be valid ISO date strings.',
        });
      }

      customRange = { startDate, endDate };
    }

    const stats = await activityService.getStats(timeRange, customRange);

    res.json({
      success: true,
      data: stats,
      meta: {
        calculatedAt: new Date().toISOString(),
        timeRange,
      },
    });
  })
);

router.get(
  '/trend',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
    const rawDays = parseInt(req.query.days as string, 10);
    const days = Math.min(
      isNaN(rawDays) || rawDays < 1 ? DEFAULT_TREND_DAYS : rawDays,
      MAX_TREND_DAYS
    );

    const result = await activityService.getTrend(days);

    res.json({
      success: true,
      ...result,
    });
  })
);

router.get(
  '/top-actions',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 10 : rawLimit, MAX_ACTIONS_LIMIT);

    const timeRangeResult = parseTimeRange(req.query.timeRange as string | undefined);
    if (typeof timeRangeResult === 'object' && 'error' in timeRangeResult) {
      return res.status(400).json({
        success: false,
        error: timeRangeResult.error,
      });
    }
    const timeRange = timeRangeResult;

    const result = await activityService.getTopActions(limit, timeRange);

    res.json({
      success: true,
      ...result,
    });
  })
);

router.get(
  '/breakdown',
  authenticate,
  requirePermission('activities.read'),
  asyncHandler(async (req, res) => {
    // Validate groupBy BEFORE assignment
    const rawGroupBy = req.query.groupBy as string | undefined;
    if (rawGroupBy && !['resource', 'user', 'ip'].includes(rawGroupBy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid groupBy parameter. Must be one of: resource, user, ip',
      });
    }
    const groupBy = (rawGroupBy as 'resource' | 'user' | 'ip') ?? 'resource';

    // Validate limit with proper parseInt
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 10 : rawLimit, MAX_BREAKDOWN_LIMIT);

    // Validate timeRange BEFORE assignment
    const timeRangeResult = parseTimeRange(req.query.timeRange as string | undefined);
    if (typeof timeRangeResult === 'object' && 'error' in timeRangeResult) {
      return res.status(400).json({
        success: false,
        error: timeRangeResult.error,
      });
    }
    const timeRange = timeRangeResult;

    const result = await activityService.getBreakdown(groupBy, limit, timeRange);

    res.json({
      success: true,
      ...result,
    });
  })
);

export default router;
