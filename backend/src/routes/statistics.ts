import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService';
import { requireFeature } from '../middleware/featureFlags';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const statisticsService = new StatisticsService();

// Global softAuth (from server.ts) already populates req.user for all routes
// No need to apply softAuth again at router level

// Apply feature flag check to all routes in this router
// Admins with settings.update permission will bypass this check (via global softAuth)
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
