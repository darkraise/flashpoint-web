import { LRUCache } from 'lru-cache';
import { GameService, GameSearchQuery, PaginatedResult, Game } from './GameService';
import { PerformanceMetrics } from './PerformanceMetrics';
import { FallbackCache } from './FallbackCache';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * LRU Cache for game search results
 *
 * Configuration:
 * - Max entries: 1000 (supports ~1000 unique search queries)
 * - TTL: 5 minutes (300,000ms)
 * - Size calculation: Based on result count
 *
 * Cache invalidation: Automatic via TTL (no manual invalidation needed
 * since Flashpoint database is read-only and changes are rare)
 */
export class GameSearchCache {
  private static readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  // In-flight request tracking for cache stampede prevention
  private static inFlightRequests = new Map<string, Promise<PaginatedResult<Game>>>();

  private static cache = new LRUCache<string, PaginatedResult<Game>>({
    max: 1000, // Maximum 1000 cached search queries
    maxSize: 10000, // Maximum total items across all cached results (10k games)
    ttl: GameSearchCache.CACHE_TTL,
    updateAgeOnGet: true, // Reset TTL on cache hit
    allowStale: false, // Never return stale data

    sizeCalculation: (value) => {
      if (!value || !value.data || !Array.isArray(value.data)) {
        logger.error('[GameSearchCache] Invalid value in sizeCalculation', { value });
        return 1; // Return minimum valid size to prevent cache errors
      }
      // LRU cache requires positive integer (>= 1), so add 1 to handle empty arrays
      return value.data.length + 1;
    },

    dispose: (value, key) => {
      logger.debug(`[GameSearchCache] Evicted cache entry: ${key}`);
    },
  });

  private static gameService = new GameService();
  private static fallbackCache = new FallbackCache<PaginatedResult<Game>>(500);

  /** Ensures consistent key generation regardless of parameter order */
  private static generateCacheKey(query: GameSearchQuery): string {
    const normalizedQuery = {
      search: query.search || '',
      platforms: query.platforms ? [...query.platforms].sort().join(',') : '',
      series: query.series ? [...query.series].sort().join(',') : '',
      developers: query.developers ? [...query.developers].sort().join(',') : '',
      publishers: query.publishers ? [...query.publishers].sort().join(',') : '',
      playModes: query.playModes ? [...query.playModes].sort().join(',') : '',
      languages: query.languages ? [...query.languages].sort().join(',') : '',
      library: query.library || '',
      tags: query.tags ? [...query.tags].sort().join(',') : '',
      yearFrom: query.yearFrom ?? '',
      yearTo: query.yearTo ?? '',
      dateAddedSince: query.dateAddedSince || '',
      dateModifiedSince: query.dateModifiedSince || '',
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
      showBroken: query.showBroken,
      showExtreme: query.showExtreme,
      fields: query.fields || 'detail',
    };

    return JSON.stringify(normalizedQuery);
  }

  static async searchGames(
    query: GameSearchQuery
  ): Promise<PaginatedResult<Game> & { fromCache?: boolean; cacheAge?: number }> {
    const cacheKey = this.generateCacheKey(query);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug(`[GameSearchCache] Cache HIT: ${cacheKey.substring(0, 100)}...`);
      PerformanceMetrics.recordCacheHit('gameSearch');
      return cached;
    }

    // Cache stampede prevention: coalesce concurrent requests for the same query
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      logger.debug(`[GameSearchCache] Coalescing request for: ${cacheKey.substring(0, 100)}...`);
      return inFlight;
    }

    logger.debug(`[GameSearchCache] Cache MISS: ${cacheKey.substring(0, 100)}...`);
    PerformanceMetrics.recordCacheMiss('gameSearch');

    const queryPromise = this.executeQuery(query, cacheKey);
    this.inFlightRequests.set(cacheKey, queryPromise);

    try {
      return await queryPromise;
    } finally {
      // Always clean up in-flight tracking
      this.inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Execute the actual database query (separated for request coalescing)
   */
  private static async executeQuery(
    query: GameSearchQuery,
    cacheKey: string
  ): Promise<PaginatedResult<Game> & { fromCache?: boolean; cacheAge?: number }> {
    const startTime = performance.now();

    try {
      const result = await this.gameService.searchGames(query);

      const executionTime = Math.round(performance.now() - startTime);
      logger.debug(`[GameSearchCache] Query executed in ${executionTime}ms, caching result`);

      // Validate result before caching
      if (!result || !result.data || !Array.isArray(result.data)) {
        logger.error('[GameSearchCache] Invalid result from database query', {
          result,
          cacheKey: cacheKey.substring(0, 200),
        });
        throw new Error('Invalid database query result');
      }

      // Store in both primary and fallback cache
      this.cache.set(cacheKey, result);
      this.fallbackCache.set(cacheKey, result);

      return result;
    } catch (error) {
      // Database query failed - try fallback cache
      logger.warn('[GameSearchCache] Database query failed, attempting fallback cache', {
        error: error instanceof Error ? error.message : String(error),
      });

      const fallback = this.fallbackCache.get(cacheKey);
      if (fallback) {
        logger.info('[GameSearchCache] Serving stale data from fallback cache', {
          age: `${Math.round(fallback.age / 1000)}s`,
          cachedAt: new Date(fallback.cachedAt).toISOString(),
        });

        // Return stale data with metadata
        return {
          ...fallback.data,
          fromCache: true,
          cacheAge: fallback.age,
        };
      }

      // No fallback available - rethrow error
      logger.error('[GameSearchCache] No fallback data available, error will propagate');
      throw error;
    }
  }

  /**
   * Clear entire cache
   * Use when Flashpoint database is updated externally
   * Note: Fallback cache is preserved for graceful degradation
   */
  static clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(
      `[GameSearchCache] Cleared primary cache (${size} entries), fallback cache preserved`
    );
  }

  /**
   * Clear both primary and fallback caches
   */
  static clearAllCaches(): void {
    const primarySize = this.cache.size;
    const fallbackSize = this.fallbackCache.getStats().size;

    this.cache.clear();
    this.fallbackCache.clear();

    logger.info(
      `[GameSearchCache] Cleared all caches (primary: ${primarySize}, fallback: ${fallbackSize} entries)`
    );
  }

  static getStats(): {
    primary: { size: number; max: number; ttl: number };
    fallback: { size: number; max: number };
  } {
    return {
      primary: {
        size: this.cache.size,
        max: this.cache.max,
        ttl: GameSearchCache.CACHE_TTL,
      },
      fallback: this.fallbackCache.getStats(),
    };
  }

  static has(query: GameSearchQuery): boolean {
    const cacheKey = this.generateCacheKey(query);
    return this.cache.has(cacheKey);
  }

  /**
   * Pre-warm cache with common queries
   * Call this after database initialization for instant first page load
   *
   * Pre-warms:
   * - Default home page query (first page, default sort)
   * - Games library (first page)
   * - Animations library (first page)
   */
  static async prewarmCache(): Promise<void> {
    if (!config.enableCachePrewarm) {
      logger.info('[GameSearchCache] Cache pre-warming disabled');
      return;
    }

    logger.info('[GameSearchCache] Starting cache pre-warming...');
    const startTime = performance.now();

    // Common queries to pre-warm
    const commonQueries: Partial<GameSearchQuery>[] = [
      // Default home page - games library
      { library: 'arcade', page: 1, limit: 50, sortBy: 'title', sortOrder: 'asc', fields: 'list' },
      // Default home page - animations library
      { library: 'theatre', page: 1, limit: 50, sortBy: 'title', sortOrder: 'asc', fields: 'list' },
      // Recently added games
      {
        library: 'arcade',
        page: 1,
        limit: 50,
        sortBy: 'dateAdded',
        sortOrder: 'desc',
        fields: 'list',
      },
      // Recently added animations
      {
        library: 'theatre',
        page: 1,
        limit: 50,
        sortBy: 'dateAdded',
        sortOrder: 'desc',
        fields: 'list',
      },
    ];

    let successCount = 0;
    let failCount = 0;

    for (const partialQuery of commonQueries) {
      const query: GameSearchQuery = {
        search: '',
        page: 1,
        limit: 50,
        sortBy: 'title',
        sortOrder: 'asc',
        fields: 'list',
        showBroken: false,
        showExtreme: false,
        ...partialQuery,
      };

      try {
        const queryStart = performance.now();
        await this.searchGames(query);
        const queryDuration = Math.round(performance.now() - queryStart);

        logger.debug(`[GameSearchCache] Pre-warmed query in ${queryDuration}ms`, {
          library: query.library,
          sortBy: query.sortBy,
        });

        successCount++;
      } catch (error) {
        logger.warn('[GameSearchCache] Failed to pre-warm query', {
          query: partialQuery,
          error: error instanceof Error ? error.message : String(error),
        });
        failCount++;
      }
    }

    const totalDuration = Math.round(performance.now() - startTime);
    logger.info(`[GameSearchCache] Cache pre-warming completed in ${totalDuration}ms`, {
      success: successCount,
      failed: failCount,
      total: commonQueries.length,
    });
  }

  static isPrewarmed(): boolean {
    // Check if at least the default games query is cached
    const defaultQuery: GameSearchQuery = {
      search: '',
      library: 'arcade',
      page: 1,
      limit: 50,
      sortBy: 'title',
      sortOrder: 'asc',
      fields: 'list',
      showBroken: false,
      showExtreme: false,
    };
    return this.has(defaultQuery);
  }
}
