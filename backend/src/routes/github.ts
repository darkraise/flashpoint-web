import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// In-memory cache for GitHub star count (avoid hitting 60/hr unauthenticated rate limit)
let cachedStars: { count: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

// Proxy to avoid browser CORS issues with GitHub API
router.get(
  '/stars',
  asyncHandler(async (_req: Request, res: Response) => {
    if (cachedStars && Date.now() - cachedStars.fetchedAt < CACHE_TTL_MS) {
      return res.json({
        success: true,
        data: { stars: cachedStars.count },
      });
    }

    const repoUrl = 'https://api.github.com/repos/darkraise/flashpoint-web';

    const response = await fetch(repoUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Flashpoint-Web-App',
      },
    });

    if (!response.ok) {
      // If rate-limited and we have a stale cache, return it
      if (cachedStars) {
        logger.debug('[GitHub] Rate limited, returning stale cache');
        return res.json({
          success: true,
          data: { stars: cachedStars.count },
        });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = (await response.json()) as { stargazers_count: number };

    cachedStars = { count: data.stargazers_count, fetchedAt: Date.now() };

    res.json({
      success: true,
      data: {
        stars: data.stargazers_count,
      },
    });
  })
);

export default router;
