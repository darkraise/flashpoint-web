import { Request, Response, NextFunction } from 'express';
import { PerformanceMetrics } from '../services/PerformanceMetrics';

/**
 * Performance tracking middleware
 *
 * Automatically tracks response times for all API endpoints
 * Integrates with PerformanceMetrics service
 */
export function performanceTracking(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();

  // Track when response finishes
  res.on('finish', () => {
    const duration = Math.round(performance.now() - startTime);

    // Normalize path (remove IDs and dynamic segments for aggregation)
    const normalizedPath = normalizePath(req.path);

    // Record metric
    PerformanceMetrics.recordEndpoint(normalizedPath, req.method, duration);
  });

  next();
}

/**
 * Normalize API path for metric aggregation
 *
 * Replaces dynamic segments (IDs, UUIDs) with placeholders
 * Examples:
 * - /api/games/abc-123 → /api/games/:id
 * - /api/playlists/456/games → /api/playlists/:id/games
 * - /api/users/789 → /api/users/:id
 */
function normalizePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace alphanumeric IDs (game IDs, share tokens)
    .replace(/\/[a-zA-Z0-9_-]{8,}/g, '/:id');
}
