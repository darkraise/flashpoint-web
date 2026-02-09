import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService';
import { requireFeature } from '../middleware/featureFlags';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const statisticsService = new StatisticsService();

router.use(requireFeature('enableStatistics'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const statistics = await statisticsService.getStatistics();
    res.json(statistics);
  })
);

export default router;
