import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { rateLimitStandard } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to prevent abuse
router.use(rateLimitStandard);

// Apply optional auth middleware to all routes
router.use(optionalAuth);

// GET /api/platforms - List all platforms
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
