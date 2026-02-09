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
    const sql = `SELECT DISTINCT tagsStr FROM game WHERE tagsStr IS NOT NULL AND tagsStr != ''`;
    const results = DatabaseService.all(sql, []) as Array<{ tagsStr: string }>;

    const tagCounts = new Map<string, number>();

    results.forEach((row) => {
      const tags = row.tagsStr
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean);
      tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(tags);
  })
);

export default router;
