import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/github/stars
 * Proxy endpoint for fetching GitHub star count
 * Avoids CORS issues when calling GitHub API from browser
 */
router.get('/stars', async (_req: Request, res: Response) => {
  try {
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
  } catch (error) {
    logger.error('Failed to fetch GitHub stars:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch GitHub star count',
      },
    });
  }
});

export default router;
