import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService';
import { requireFeature } from '../middleware/featureFlags';
import { logger } from '../utils/logger';

const router = Router();
const statisticsService = new StatisticsService();

// Apply feature flag check to all routes in this router
router.use(requireFeature('enableStatistics'));

/**
 * GET /api/statistics
 * Get overall Flashpoint archive statistics
 */
router.get('/', async (req, res, next) => {
  try {
    const statistics = await statisticsService.getStatistics();
    res.json(statistics);
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    next(error);
  }
});

export default router;
