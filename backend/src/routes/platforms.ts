import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Apply optional auth middleware to all routes
router.use(optionalAuth);

// GET /api/platforms - List all platforms
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT platformName as platform, COUNT(*) as count
      FROM game
      WHERE platformName IS NOT NULL AND platformName != ''
      GROUP BY platformName
      ORDER BY platformName ASC
    `;

    const platforms = DatabaseService.all(sql, []) as Array<{ platform: string; count: number }>;

    res.json(platforms);
  } catch (error) {
    next(error);
  }
});

export default router;
