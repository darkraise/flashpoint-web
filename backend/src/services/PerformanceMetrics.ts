import { logger } from '../utils/logger';

/**
 * Metric data point
 */
interface MetricPoint {
  timestamp: number;
  value: number;
}

/**
 * Aggregated metric statistics
 */
interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number; // Median
  p95: number; // 95th percentile
  p99: number; // 99th percentile
}

/**
 * Performance metrics service
 *
 * Tracks API performance, cache hit rates, and system metrics
 * Stores metrics in-memory with configurable retention
 */
export class PerformanceMetrics {
  // API endpoint response times (ms)
  private static endpointMetrics = new Map<string, MetricPoint[]>();

  // Cache hit/miss tracking
  private static cacheMetrics = new Map<string, { hits: number; misses: number }>();

  // Query execution times (ms)
  private static queryMetrics: MetricPoint[] = [];

  // Configuration
  private static readonly MAX_DATA_POINTS = 10000; // Keep last 10k measurements
  private static readonly RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record API endpoint response time
   */
  static recordEndpoint(path: string, method: string, durationMs: number): void {
    const key = `${method} ${path}`;

    if (!this.endpointMetrics.has(key)) {
      this.endpointMetrics.set(key, []);
    }

    const metrics = this.endpointMetrics.get(key)!;
    metrics.push({
      timestamp: Date.now(),
      value: durationMs
    });

    // Trim old data points
    if (metrics.length > this.MAX_DATA_POINTS) {
      metrics.shift();
    }

    // Log slow endpoints (>1000ms)
    if (durationMs > 1000) {
      logger.warn('[PerformanceMetrics] Slow endpoint detected', {
        endpoint: key,
        duration: `${durationMs}ms`
      });
    }
  }

  /**
   * Record cache hit
   */
  static recordCacheHit(cacheName: string): void {
    if (!this.cacheMetrics.has(cacheName)) {
      this.cacheMetrics.set(cacheName, { hits: 0, misses: 0 });
    }

    this.cacheMetrics.get(cacheName)!.hits++;
  }

  /**
   * Record cache miss
   */
  static recordCacheMiss(cacheName: string): void {
    if (!this.cacheMetrics.has(cacheName)) {
      this.cacheMetrics.set(cacheName, { hits: 0, misses: 0 });
    }

    this.cacheMetrics.get(cacheName)!.misses++;
  }

  /**
   * Record database query execution time
   */
  static recordQuery(durationMs: number): void {
    this.queryMetrics.push({
      timestamp: Date.now(),
      value: durationMs
    });

    // Trim old data points
    if (this.queryMetrics.length > this.MAX_DATA_POINTS) {
      this.queryMetrics.shift();
    }
  }

  /**
   * Get statistics for a specific endpoint
   */
  static getEndpointStats(path: string, method: string): MetricStats | null {
    const key = `${method} ${path}`;
    const metrics = this.endpointMetrics.get(key);

    if (!metrics || metrics.length === 0) {
      return null;
    }

    return this.calculateStats(metrics);
  }

  /**
   * Get statistics for all endpoints
   */
  static getAllEndpointStats(): Record<string, MetricStats> {
    const stats: Record<string, MetricStats> = {};

    for (const [key, metrics] of this.endpointMetrics.entries()) {
      if (metrics.length > 0) {
        stats[key] = this.calculateStats(metrics);
      }
    }

    return stats;
  }

  /**
   * Get cache hit rates
   */
  static getCacheStats(): Record<string, { hits: number; misses: number; hitRate: number }> {
    const stats: Record<string, { hits: number; misses: number; hitRate: number }> = {};

    for (const [cacheName, metrics] of this.cacheMetrics.entries()) {
      const total = metrics.hits + metrics.misses;
      const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;

      stats[cacheName] = {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: Math.round(hitRate * 100) / 100 // Round to 2 decimal places
      };
    }

    return stats;
  }

  /**
   * Get query performance statistics
   */
  static getQueryStats(): MetricStats | null {
    if (this.queryMetrics.length === 0) {
      return null;
    }

    return this.calculateStats(this.queryMetrics);
  }

  /**
   * Get top N slowest endpoints
   */
  static getSlowestEndpoints(limit: number = 10): Array<{ endpoint: string; avgDuration: number }> {
    const endpointStats = this.getAllEndpointStats();

    return Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: Math.round(stats.avg)
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Calculate statistics from metric points
   */
  private static calculateStats(points: MetricPoint[]): MetricStats {
    const values = points.map(p => p.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count,
      sum,
      min: values[0],
      max: values[count - 1],
      avg: sum / count,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99)
    };
  }

  /**
   * Calculate percentile value
   */
  private static percentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Clear old metrics (older than retention period)
   */
  static cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.RETENTION_MS;

    // Cleanup endpoint metrics
    for (const [key, metrics] of this.endpointMetrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);

      if (filtered.length === 0) {
        this.endpointMetrics.delete(key);
      } else {
        this.endpointMetrics.set(key, filtered);
      }
    }

    // Cleanup query metrics
    this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff);

    logger.debug('[PerformanceMetrics] Cleaned up old metrics');
  }

  /**
   * Reset all metrics
   */
  static reset(): void {
    this.endpointMetrics.clear();
    this.cacheMetrics.clear();
    this.queryMetrics = [];
    logger.info('[PerformanceMetrics] All metrics reset');
  }

  /**
   * Get summary of all metrics
   */
  static getSummary(): {
    endpoints: { total: number; slowest: Array<{ endpoint: string; avgDuration: number }> };
    caches: Record<string, { hits: number; misses: number; hitRate: number }>;
    queries: MetricStats | null;
  } {
    return {
      endpoints: {
        total: this.endpointMetrics.size,
        slowest: this.getSlowestEndpoints(5)
      },
      caches: this.getCacheStats(),
      queries: this.getQueryStats()
    };
  }
}
