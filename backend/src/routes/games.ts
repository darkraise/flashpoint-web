import { Router } from 'express';
import { GameService } from '../services/GameService';
import { GameSearchCache } from '../services/GameSearchCache';
import { gameDataService } from '../services/GameDataService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { sharedAccessAuth, validateSharedGameAccess } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';
import { rateLimitStandard } from '../middleware/rateLimiter';
import { z } from 'zod';

const router = Router();
const gameService = new GameService();

router.use(rateLimitStandard);
router.use(sharedAccessAuth);

// z.coerce.boolean() treats 'false' as truthy; this handles string→boolean correctly
const booleanSchema = z.preprocess((val) => {
  if (val === 'false' || val === '0' || val === false) return false;
  if (val === 'true' || val === '1' || val === true) return true;
  return val;
}, z.boolean());

const gameIdSchema = z.string().uuid('Invalid game ID format');

// Schema for POST search requests (arrays in JSON body) - supports complex filter combinations
const searchBodySchema = z.object({
  search: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  series: z.array(z.string()).optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  playModes: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  library: z.enum(['arcade', 'theatre']).optional(),
  tags: z.array(z.string()).optional(),
  yearFrom: z.number().int().min(1970).max(2100).optional(),
  yearTo: z.number().int().min(1970).max(2100).optional(),
  dateAddedSince: z.string().datetime().optional(),
  dateModifiedSince: z.string().datetime().optional(),
  sortBy: z
    .enum(['title', 'releaseDate', 'dateAdded', 'dateModified', 'developer'])
    .default('title'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  showBroken: z.boolean().default(false),
  showExtreme: z.boolean().default(false),
});

// POST search endpoint - handles complex filter combinations without URL length limits
router.post(
  '/',
  logActivity('games.search', 'games', (req, res) => {
    const body = req.body || {};
    const filters = [
      'platforms',
      'series',
      'developers',
      'publishers',
      'playModes',
      'languages',
      'library',
      'tags',
      'yearFrom',
      'yearTo',
    ];
    const activeFilters = filters.filter((f) => {
      const val = body[f];
      return Array.isArray(val) ? val.length > 0 : val !== undefined;
    }).length;

    return {
      query: body.search || null,
      filterCount: activeFilters,
      resultCount: res.locals.resultCount || 0,
      hasSearch: !!body.search,
    };
  }),
  asyncHandler(async (req, res) => {
    const body = searchBodySchema.parse(req.body);

    const result = await GameSearchCache.searchGames({
      search: body.search,
      platforms: body.platforms,
      series: body.series,
      developers: body.developers,
      publishers: body.publishers,
      playModes: body.playModes,
      languages: body.languages,
      library: body.library,
      tags: body.tags,
      yearFrom: body.yearFrom,
      yearTo: body.yearTo,
      dateAddedSince: body.dateAddedSince,
      dateModifiedSince: body.dateModifiedSince,
      sortBy: body.sortBy,
      sortOrder: body.sortOrder,
      page: body.page,
      limit: body.limit,
      showBroken: body.showBroken,
      showExtreme: body.showExtreme,
      fields: 'list',
    });

    res.locals.resultCount = result.total;

    res.json(result);
  })
);

const filterOptionsQuerySchema = z.object({
  platform: z.string().optional(),
  library: z.enum(['arcade', 'theatre']).optional(),
  // Context-aware filter params - when set, filter options reflect current selection
  series: z.string().optional(),
  developers: z.string().optional(),
  publishers: z.string().optional(),
  playModes: z.string().optional(),
  languages: z.string().optional(),
  tags: z.string().optional(),
  yearFrom: z.coerce.number().int().min(1970).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1970).max(2100).optional(),
  refresh: booleanSchema.optional(),
  // Exclude filter types from response (comma-separated: series,developers,publishers,playModes,languages,tags)
  // Used to skip re-fetching options for already-active filters
  exclude: z.string().optional(),
});

router.get(
  '/filter-options',
  asyncHandler(async (req, res) => {
    const query = filterOptionsQuerySchema.parse(req.query);

    // Clear all related caches if refresh requested - ensures filter counts match search results
    if (query.refresh) {
      GameService.clearFilterOptionsCache();
      GameSearchCache.clearCache();
    }

    // Parse excluded filter types
    const excludeSet = new Set(query.exclude?.split(',').filter(Boolean) ?? []);

    const filterOptions = await gameService.getFilterOptions(
      {
        platform: query.platform,
        library: query.library,
        // Pass context filters (comma-separated strings become arrays)
        series: query.series?.split(',').filter(Boolean),
        developers: query.developers?.split(',').filter(Boolean),
        publishers: query.publishers?.split(',').filter(Boolean),
        playModes: query.playModes?.split(',').filter(Boolean),
        languages: query.languages?.split(',').filter(Boolean),
        tags: query.tags?.split(',').filter(Boolean),
        yearFrom: query.yearFrom,
        yearTo: query.yearTo,
      },
      excludeSet
    );
    res.json(filterOptions);
  })
);

router.get(
  '/most-played',
  asyncHandler(async (req, res) => {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string, 10) || 20, 50));
    const games = await gameService.getMostPlayedGames(limit);

    res.json({
      success: true,
      data: games,
      total: games.length,
    });
  })
);

// Must be defined BEFORE /:id to avoid being shadowed
router.get(
  '/random',
  asyncHandler(async (req, res) => {
    const librarySchema = z.enum(['arcade', 'theatre']).optional();

    const library = librarySchema.parse(req.query.library);
    // Parse platforms - can be comma-separated string or array
    let platforms: string[] | undefined;
    if (req.query.platforms) {
      const raw = req.query.platforms;
      if (typeof raw === 'string') {
        platforms = raw.split(',').map((p) => p.trim()).filter(Boolean);
      } else if (Array.isArray(raw)) {
        platforms = (raw as string[])
          .filter((p) => typeof p === 'string')
          .map((p) => p.trim())
          .filter(Boolean);
      }
    }

    const game = await gameService.getRandomGame(library, platforms);

    if (!game) {
      throw new AppError(404, 'No games found');
    }

    res.json(game);
  })
);

router.get(
  '/:id',
  validateSharedGameAccess('id'),
  logActivity('games.view', 'games', (req, res) => ({
    platform: res.locals.game?.platformName,
    library: res.locals.game?.library,
    broken: res.locals.game?.broken,
    extreme: res.locals.game?.extreme,
  })),
  asyncHandler(async (req, res) => {
    const id = gameIdSchema.parse(req.params.id);
    const game = await gameService.getGameById(id);

    if (!game) {
      throw new AppError(404, 'Game not found');
    }

    res.locals.game = game;

    res.json(game);
  })
);

router.get(
  '/:id/related',
  validateSharedGameAccess('id'),
  asyncHandler(async (req, res) => {
    const id = gameIdSchema.parse(req.params.id);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string, 10) || 10, 50));
    const relatedGames = await gameService.getRelatedGames(id, limit);

    res.json(relatedGames);
  })
);

router.get(
  '/:id/launch',
  validateSharedGameAccess('id'),
  logActivity('games.launch.request', 'games', (req, res) => ({
    platform: res.locals.platform,
    canPlayInBrowser: res.locals.canPlayInBrowser,
    launchCommand: res.locals.launchCommand,
  })),
  asyncHandler(async (req, res) => {
    const id = gameIdSchema.parse(req.params.id);
    const game = await gameService.getGameById(id);

    if (!game) {
      throw new AppError(404, 'Game not found');
    }

    // Awaited so local ZIPs are ready before we return the URL.
    // For downloads, returns quickly with { mounted: false, downloading: true }.
    const mountResult = await gameDataService.mountGameZip(game.id);
    const downloading = mountResult.downloading || false;

    let launchCommand = game.launchCommand || '';

    // Fallback: get path from game_data table
    if (!launchCommand) {
      const gameDataPath = await gameService.getGameDataPath(game.id);
      if (gameDataPath) {
        launchCommand = gameDataPath;
      }
    }

    let contentUrl = '';
    if (launchCommand) {
      const proxyUrl = '/game-proxy';

      if (launchCommand.startsWith('http://') || launchCommand.startsWith('https://')) {
        contentUrl = `${proxyUrl}/${launchCommand}`;
      } else {
        // Relative paths need a domain derived from game.source
        let fullUrl = launchCommand;

        if (game.source) {
          try {
            const sourceUrl = new URL(game.source);
            const domain = sourceUrl.hostname;
            const urlPath = launchCommand.startsWith('/') ? launchCommand : `/${launchCommand}`;
            fullUrl = `http://${domain}${urlPath}`;
          } catch {
            fullUrl = launchCommand.startsWith('http') ? launchCommand : `http://${launchCommand}`;
          }
        }

        // Don't encode - proxy handler expects /http://domain/path format
        contentUrl = `${proxyUrl}/${fullUrl}`;
      }
    }

    const hasContent = launchCommand.trim().length > 0;

    const isWebPlayablePlatform = game.platformName === 'Flash' || game.platformName === 'HTML5';
    const canPlayInBrowser = isWebPlayablePlatform && hasContent;

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
      canPlayInBrowser,
      downloading,
    });
  })
);

export default router;
