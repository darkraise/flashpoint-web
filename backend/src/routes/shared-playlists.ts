import { Router } from 'express';
import { z } from 'zod';
import { validateSharedPlaylist } from '../middleware/validateSharedPlaylist';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { UserPlaylistService } from '../services/UserPlaylistService';
import { UserService } from '../services/UserService';
import { AppError } from '../middleware/errorHandler';
import { rateLimitStrict } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { generateSharedAccessToken } from '../utils/jwt';

const router = Router();
const playlistService = new UserPlaylistService();
const userService = new UserService();

// Validation schema
const clonePlaylistSchema = z.object({
  newTitle: z.string().min(1).max(255).optional(),
});

/**
 * GET /api/playlists/shared/:shareToken
 * Get shared playlist metadata (anonymous access)
 *
 * Rate limited to 10 requests/minute per IP to prevent scraping
 */
router.get(
  '/:shareToken',
  rateLimitStrict, // 10 req/min per IP
  validateSharedPlaylist,
  asyncHandler(async (req, res) => {
    const playlist = req.sharedPlaylist!;

    // Sanitize response - don't expose sensitive fields
    const response: {
      id: number;
      title: string;
      description: string | null;
      icon: string | null;
      gameCount: number;
      createdAt: string;
      updatedAt: string;
      ownerUsername?: string;
    } = {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      icon: playlist.icon,
      gameCount: playlist.gameCount,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };

    // Conditionally include owner username if showOwner flag is true
    if (playlist.showOwner) {
      const user = await userService.getUserById(playlist.userId);
      response.ownerUsername = user?.username || 'Unknown';
    }

    // Don't expose: userId, shareToken, isPublic, shareExpiresAt, showOwner
    logger.debug(`Shared playlist ${playlist.id} accessed via token`);

    res.json(response);
  })
);

/**
 * GET /api/playlists/shared/:shareToken/games
 * Get games in shared playlist (anonymous access)
 *
 * Rate limited to prevent scraping
 */
router.get(
  '/:shareToken/games',
  rateLimitStrict,
  validateSharedPlaylist,
  asyncHandler(async (req, res) => {
    const games = await playlistService.getSharedPlaylistGames(req.params.shareToken);

    logger.debug(
      `Shared playlist ${req.sharedPlaylist!.id} games accessed (${games.length} games)`
    );

    res.json(games);
  })
);

/**
 * GET /api/playlists/shared/:shareToken/games/:gameId/validate
 * Validate if a game is accessible via shared playlist (anonymous access)
 *
 * Returns: { valid: boolean }
 * Rate limited to prevent abuse
 */
router.get(
  '/:shareToken/games/:gameId/validate',
  rateLimitStrict,
  validateSharedPlaylist,
  asyncHandler(async (req, res) => {
    const { shareToken, gameId } = req.params;

    // Validate UUID format for shareToken
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(shareToken)) {
      return res.json({ valid: false });
    }

    // Validate gameId format (Flashpoint uses UUIDs for game IDs)
    if (!gameId || typeof gameId !== 'string') {
      return res.json({ valid: false });
    }

    const isValid = playlistService.isGameInSharedPlaylist(shareToken, gameId);

    logger.debug(`Game ${gameId.substring(0, 8)}... access validation via share token: ${isValid}`);

    res.json({ valid: isValid });
  })
);

/**
 * POST /api/playlists/shared/:shareToken/generate-access-token
 * Generate a temporary shared access token (60 min expiry)
 * Returns: { accessToken, expiresIn, playlistId }
 * Rate limited to prevent abuse
 */
router.post(
  '/:shareToken/generate-access-token',
  rateLimitStrict,
  validateSharedPlaylist,
  asyncHandler(async (req, res) => {
    const playlist = req.sharedPlaylist!;

    const accessToken = generateSharedAccessToken({
      shareToken: req.params.shareToken,
      playlistId: playlist.id,
    });

    logger.debug(`Generated shared access token for playlist ${playlist.id}`);

    res.json({
      accessToken,
      expiresIn: 3600, // 60 minutes in seconds
      playlistId: playlist.id,
    });
  })
);

/**
 * POST /api/playlists/shared/:shareToken/clone
 * Clone shared playlist to authenticated user's account
 *
 * Requires authentication and playlists.create permission
 */
router.post(
  '/:shareToken/clone',
  authenticate,
  requirePermission('playlists.create'),
  validateSharedPlaylist,
  asyncHandler(async (req, res) => {
    // Validate request body
    const { newTitle } = clonePlaylistSchema.parse(req.body);

    const clonedPlaylist = playlistService.cloneSharedPlaylist(
      req.params.shareToken,
      req.user!.id,
      newTitle
    );

    if (!clonedPlaylist) {
      throw new AppError(400, 'Unable to clone playlist');
    }

    logger.info(
      `User ${req.user!.id} cloned shared playlist ${req.sharedPlaylist!.id} as "${clonedPlaylist.title}"`
    );

    res.status(201).json(clonedPlaylist);
  })
);

export default router;
