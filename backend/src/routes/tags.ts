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

// GET /api/tags - List all unique tags
router.get('/', asyncHandler(async (req, res) => {
  // Get all games with tags
  const sql = `SELECT DISTINCT tagsStr FROM game WHERE tagsStr IS NOT NULL AND tagsStr != ''`;
  const results = DatabaseService.all(sql, []) as Array<{ tagsStr: string }>;

  // Parse tags (semicolon-separated) and count occurrences
  const tagCounts = new Map<string, number>();

  results.forEach(row => {
    const tags = row.tagsStr.split(';').map(t => t.trim()).filter(Boolean);
    tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // Convert to array and sort by count
  const tags = Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json(tags);
}));

export default router;
