import { Router } from 'express';
import { GameService } from '../services/GameService';
import { gameDataService } from '../services/GameDataService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { sharedAccessAuth, validateSharedGameAccess } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';
import { z } from 'zod';

const router = Router();
const gameService = new GameService();

// Apply shared access auth middleware to all routes
router.use(sharedAccessAuth);

// Custom boolean parser that handles string 'false' correctly
const booleanSchema = z.preprocess((val) => {
  if (val === 'false' || val === '0' || val === false) return false;
  if (val === 'true' || val === '1' || val === true) return true;
  return val;
}, z.boolean());

// Validation schemas
const searchQuerySchema = z.object({
  search: z.string().optional(),
  platform: z.string().optional(), // Comma-separated platforms
  series: z.string().optional(), // Comma-separated series
  developers: z.string().optional(), // Comma-separated developers
  publishers: z.string().optional(), // Comma-separated publishers
  playModes: z.string().optional(), // Comma-separated play modes
  languages: z.string().optional(), // Comma-separated languages
  library: z.enum(['arcade', 'theatre']).optional(),
  tags: z.string().optional(),
  yearFrom: z.coerce.number().int().min(1970).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1970).max(2100).optional(),
  sortBy: z.enum(['title', 'releaseDate', 'dateAdded', 'developer']).default('title'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  showBroken: booleanSchema.default(false),
  showExtreme: booleanSchema.default(false)
});

// GET /api/games - List games with pagination and filters
router.get(
  '/',
  logActivity('games.search', 'games', (req, res) => {
    // Count active filters
    const filters = ['platform', 'series', 'developers', 'publishers', 'playModes', 'languages', 'library', 'tags', 'yearFrom', 'yearTo'];
    const activeFilters = filters.filter(f => req.query[f]).length;

    return {
      query: req.query.search || null,
      filterCount: activeFilters,
      resultCount: res.locals.resultCount || 0,
      hasSearch: !!req.query.search
    };
  }),
  asyncHandler(async (req, res) => {
    const query = searchQuerySchema.parse(req.query);

    const result = await gameService.searchGames({
      search: query.search,
      platforms: query.platform?.split(',').filter(Boolean),
      series: query.series?.split(',').filter(Boolean),
      developers: query.developers?.split(',').filter(Boolean),
      publishers: query.publishers?.split(',').filter(Boolean),
      playModes: query.playModes?.split(',').filter(Boolean),
      languages: query.languages?.split(',').filter(Boolean),
      library: query.library,
      tags: query.tags?.split(',').filter(Boolean),
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
      showBroken: query.showBroken,
      showExtreme: query.showExtreme
    });

    // Store result count for activity logging
    res.locals.resultCount = result.total;

    res.json(result);
  })
);

// GET /api/games/filter-options - Get all filter options for dropdowns
router.get('/filter-options', asyncHandler(async (req, res) => {
  const filterOptions = await gameService.getFilterOptions();
  res.json(filterOptions);
}));

// GET /api/games/:id - Get single game by ID
router.get(
  '/:id',
  validateSharedGameAccess('id'),
  logActivity('games.view', 'games', (req, res) => ({
    platform: res.locals.game?.platformName,
    library: res.locals.game?.library,
    broken: res.locals.game?.broken,
    extreme: res.locals.game?.extreme
  })),
  asyncHandler(async (req, res) => {
    const game = await gameService.getGameById(req.params.id);

    if (!game) {
      throw new AppError(404, 'Game not found');
    }

    // Store game for activity logging
    res.locals.game = game;

    res.json(game);
  })
);

// GET /api/games/:id/related - Get related games
router.get('/:id/related', validateSharedGameAccess('id'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const relatedGames = await gameService.getRelatedGames(req.params.id, limit);

  res.json(relatedGames);
}));

// GET /api/games/random - Get random game
router.get('/random', asyncHandler(async (req, res) => {
  const library = req.query.library as string | undefined;
  const game = await gameService.getRandomGame(library);

  if (!game) {
    throw new AppError(404, 'No games found');
  }

  res.json(game);
}));

// GET /api/games/:id/launch - Get game launch data
router.get(
  '/:id/launch',
  validateSharedGameAccess('id'),
  logActivity('games.launch.request', 'games', (req, res) => ({
    platform: res.locals.platform,
    canPlayInBrowser: res.locals.canPlayInBrowser,
    launchCommand: res.locals.launchCommand
  })),
  asyncHandler(async (req, res) => {
    const game = await gameService.getGameById(req.params.id);

    if (!game) {
      throw new AppError(404, 'Game not found');
    }

    // Auto-mount ZIP file if game has game data
    // This ensures files are available from the GameZip server
    // Check if game has data by checking presentOnDisk field (not null means has game_data entries)
    if (game.presentOnDisk !== null) {
      await gameDataService.mountGameZip(game.id);
    }

    // Extract launch command (usually the SWF file path for Flash games)
    let launchCommand = game.launchCommand || '';

    // If no launch command but has game data, query game_data table
    if (!launchCommand && game.presentOnDisk !== null) {
      const gameDataPath = await gameService.getGameDataPath(game.id);
      if (gameDataPath) {
        launchCommand = gameDataPath;
      }
    }

    // For Flash games, the launch command is typically the SWF file path
    // For HTML5 games, it's usually an index.html file
    // The path is relative to the htdocs folder OR an absolute URL

    let contentUrl = '';
    if (launchCommand) {
      // Use HTTP proxy server (port 22500) directly for game files
      const proxyPort = process.env.PROXY_PORT || '22500';
      const proxyUrl = `http://localhost:${proxyPort}`;

      // Check if launch command is an absolute URL
      if (launchCommand.startsWith('http://') || launchCommand.startsWith('https://')) {
        // Use the full URL as-is with the proxy
        // The HTTP proxy server handles proxy-style requests: GET http://domain.com/path HTTP/1.1
        contentUrl = `${proxyUrl}/${launchCommand}`;
      } else {
        // For relative paths, construct full URL with domain from source
        let fullUrl = launchCommand;

        if (game.source) {
          try {
            // Extract domain from source URL
            const sourceUrl = new URL(game.source);
            const domain = sourceUrl.hostname;

            // Construct full URL: http://domain/path
            const path = launchCommand.startsWith('/') ? launchCommand : `/${launchCommand}`;
            fullUrl = `http://${domain}${path}`;
          } catch {
            // If source is not a valid URL, assume launchCommand is already domain/path
            fullUrl = launchCommand.startsWith('http') ? launchCommand : `http://${launchCommand}`;
          }
        }

        contentUrl = `${proxyUrl}/${fullUrl}`;
      }
    }

    const hasContent = launchCommand.trim().length > 0;

    // Game can be played in browser if:
    // 1. It's a web-playable platform (Flash or HTML5)
    // 2. It has content (launch command)
    const isWebPlayablePlatform = game.platformName === 'Flash' || game.platformName === 'HTML5';
    const canPlayInBrowser = isWebPlayablePlatform && hasContent;

    // Store in res.locals for activity logging
    res.locals.platform = game.platformName;
    res.locals.canPlayInBrowser = canPlayInBrowser;
    res.locals.launchCommand = launchCommand;

    res.json({
      gameId: game.id,
      title: game.title,
      platform: game.platformName,
      launchCommand,
      contentUrl,
      applicationPath: game.applicationPath,
      playMode: game.playMode,
      canPlayInBrowser
    });
  })
);

export default router;
