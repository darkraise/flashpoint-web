import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService';
import { requireFeature } from '../middleware/featureFlags';
import { softAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';

const router = Router();
const statisticsService = new StatisticsService();

// Apply soft auth first so admins can bypass feature flags
// softAuth populates req.user if token exists, but never throws errors
router.use(softAuth);

// Apply feature flag check to all routes in this router
// Admins with settings.update permission will bypass this check
router.use(requireFeature('enableStatistics'));

/**
 * GET /api/statistics
 * Get overall Flashpoint archive statistics
 */
router.get('/', asyncHandler(async (req, res) => {
  const statistics = await statisticsService.getStatistics();
  res.json(statistics);
}));

export default router;
