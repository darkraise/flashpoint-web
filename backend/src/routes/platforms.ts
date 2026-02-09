import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { rateLimitStandard } from '../middleware/rateLimiter';

const router = Router();

router.use(rateLimitStandard);
router.use(optionalAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sql = `
    SELECT DISTINCT platformName as platform, COUNT(*) as count
    FROM game
    WHERE platformName IS NOT NULL AND platformName != ''
    GROUP BY platformName
    ORDER BY platformName ASC
  `;

    const platforms = DatabaseService.all(sql, []) as Array<{ platform: string; count: number }>;

    res.json(platforms);
  })
);

export default router;
