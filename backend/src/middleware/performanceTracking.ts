import { Request, Response, NextFunction } from 'express';
import { PerformanceMetrics } from '../services/PerformanceMetrics';

/** Tracks response times for all API endpoints via PerformanceMetrics. */
export function performanceTracking(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();

  res.on('finish', () => {
    const duration = Math.round(performance.now() - startTime);
    const normalizedPath = normalizePath(req.path);
    PerformanceMetrics.recordEndpoint(normalizedPath, req.method, duration);
  });

  next();
}

/** Replaces dynamic segments (IDs, UUIDs) with :id placeholders for metric aggregation. */
function normalizePath(path: string): string {
  return (
    path
      // Replace UUIDs
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      // Replace numeric IDs
      .replace(/\/\d+/g, '/:id')
      // Replace hex IDs (like game data IDs) - must contain at least one digit
      .replace(/\/[a-f0-9]{8,}/gi, '/:id')
  );
}
