import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger';

/**
 * Fallback cache for graceful degradation
 *
 * Stores successful responses with extended TTL (1 hour) to serve
 * when the primary data source (Flashpoint database) is unavailable
 */
export class FallbackCache<T = any> {
  private cache: LRUCache<string, { data: T; cachedAt: number }>;
  private readonly FALLBACK_TTL = 60 * 60 * 1000; // 1 hour

  constructor(maxSize: number = 500) {
    this.cache = new LRUCache<string, { data: T; cachedAt: number }>({
      max: maxSize,
      ttl: this.FALLBACK_TTL,
      updateAgeOnGet: true,
      allowStale: true, // Allow stale data in fallback mode
    });
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
    });
  }

  get(key: string): { data: T; cachedAt: number; age: number } | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.cachedAt;

    logger.debug('[FallbackCache] Serving cached data', {
      key: key.substring(0, 50),
      age: `${Math.round(age / 1000)}s`,
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });

    return {
      data: cached.data,
      cachedAt: cached.cachedAt,
      age,
    };
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; max: number } {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}
