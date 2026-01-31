import { LRUCache } from 'lru-cache';
import { GameService, GameSearchQuery, PaginatedResult, Game } from './GameService';
import { PerformanceMetrics } from './PerformanceMetrics';
import { FallbackCache } from './FallbackCache';
import { logger } from '../utils/logger';

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
  private static cache = new LRUCache<string, PaginatedResult<Game>>({
    max: 1000, // Maximum 1000 cached search queries
    maxSize: 10000, // Maximum total items across all cached results (10k games)
    ttl: 1000 * 60 * 5, // 5 minutes TTL
    updateAgeOnGet: true, // Reset TTL on cache hit
    allowStale: false, // Never return stale data

    // Calculate size based on number of results (larger result sets = more memory)
    sizeCalculation: (value) => {
      if (!value || !value.data || !Array.isArray(value.data)) {
        logger.error('[GameSearchCache] Invalid value in sizeCalculation', { value });
        return 1; // Return minimum valid size to prevent cache errors
      }
      // LRU cache requires positive integer (>= 1), so add 1 to handle empty arrays
      return value.data.length + 1;
    },

    // Optional: Log evictions for monitoring
    dispose: (value, key) => {
      logger.debug(`[GameSearchCache] Evicted cache entry: ${key}`);
    }
  });

  private static gameService = new GameService();
  private static fallbackCache = new FallbackCache<PaginatedResult<Game>>(500);

  /**
   * Generate cache key from search query
   * Ensures consistent key generation for same queries regardless of parameter order
   */
  private static generateCacheKey(query: GameSearchQuery): string {
    const normalizedQuery = {
      search: query.search || '',
      platforms: query.platforms?.sort().join(',') || '',
      series: query.series?.sort().join(',') || '',
      developers: query.developers?.sort().join(',') || '',
      publishers: query.publishers?.sort().join(',') || '',
      playModes: query.playModes?.sort().join(',') || '',
      languages: query.languages?.sort().join(',') || '',
      library: query.library || '',
      tags: query.tags?.sort().join(',') || '',
      yearFrom: query.yearFrom || '',
      yearTo: query.yearTo || '',
      dateAddedSince: query.dateAddedSince || '',
      dateModifiedSince: query.dateModifiedSince || '',
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
      showBroken: query.showBroken,
      showExtreme: query.showExtreme,
      fields: query.fields || 'detail'
    };

    return JSON.stringify(normalizedQuery);
  }

  /**
   * Search games with caching and graceful degradation
   * Checks cache first, falls back to database query if cache miss
   * If database fails, returns stale data from fallback cache
   */
  static async searchGames(query: GameSearchQuery): Promise<PaginatedResult<Game> & { fromCache?: boolean; cacheAge?: number }> {
    const cacheKey = this.generateCacheKey(query);

    // Try to get from primary cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug(`[GameSearchCache] Cache HIT: ${cacheKey.substring(0, 100)}...`);
      PerformanceMetrics.recordCacheHit('gameSearch');
      return cached;
    }

    // Cache miss - query database
    logger.debug(`[GameSearchCache] Cache MISS: ${cacheKey.substring(0, 100)}...`);
    PerformanceMetrics.recordCacheMiss('gameSearch');
    const startTime = performance.now();

    try {
      const result = await this.gameService.searchGames(query);

      const executionTime = Math.round(performance.now() - startTime);
      logger.debug(`[GameSearchCache] Query executed in ${executionTime}ms, caching result`);

      // Validate result before caching
      if (!result || !result.data || !Array.isArray(result.data)) {
        logger.error('[GameSearchCache] Invalid result from database query', {
          result,
          cacheKey: cacheKey.substring(0, 200)
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
        error: error instanceof Error ? error.message : String(error)
      });

      const fallback = this.fallbackCache.get(cacheKey);
      if (fallback) {
        logger.info('[GameSearchCache] Serving stale data from fallback cache', {
          age: `${Math.round(fallback.age / 1000)}s`,
          cachedAt: new Date(fallback.cachedAt).toISOString()
        });

        // Return stale data with metadata
        return {
          ...fallback.data,
          fromCache: true,
          cacheAge: fallback.age
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
    logger.info(`[GameSearchCache] Cleared primary cache (${size} entries), fallback cache preserved`);
  }

  /**
   * Clear both primary and fallback caches
   */
  static clearAllCaches(): void {
    const primarySize = this.cache.size;
    const fallbackSize = this.fallbackCache.getStats().size;

    this.cache.clear();
    this.fallbackCache.clear();

    logger.info(`[GameSearchCache] Cleared all caches (primary: ${primarySize}, fallback: ${fallbackSize} entries)`);
  }

  /**
   * Get cache statistics for monitoring
   */
  static getStats(): {
    primary: { size: number; max: number; ttl: number };
    fallback: { size: number; max: number };
  } {
    return {
      primary: {
        size: this.cache.size,
        max: this.cache.max,
        ttl: 1000 * 60 * 5 // 5 minutes
      },
      fallback: this.fallbackCache.getStats()
    };
  }

  /**
   * Check if a query is cached
   */
  static has(query: GameSearchQuery): boolean {
    const cacheKey = this.generateCacheKey(query);
    return this.cache.has(cacheKey);
  }
}
