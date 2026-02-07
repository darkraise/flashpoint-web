import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * GET /api/github/stars
 * Proxy endpoint for fetching GitHub star count
 * Avoids CORS issues when calling GitHub API from browser
 */
router.get(
  '/stars',
  asyncHandler(async (_req: Request, res: Response) => {
    const repoUrl = 'https://api.github.com/repos/darkraise/flashpoint-web';

    const response = await fetch(repoUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Flashpoint-Web-App',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = (await response.json()) as { stargazers_count: number };

    res.json({
      success: true,
      data: {
        stars: data.stargazers_count,
      },
    });
  })
);

export default router;
