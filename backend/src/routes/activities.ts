import { Router } from 'express';
import { ActivityService } from '../services/ActivityService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
const activityService = new ActivityService();

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

      const result = await activityService.getLogs(page, limit, filters);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
