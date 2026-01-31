import { ServerResponse } from 'http';

/**
 * CORS Headers Utility
 *
 * Provides consistent CORS header setting across all game-service responses
 */

interface CorsSettings {
  allowCrossDomain: boolean;
}

/**
 * Set CORS headers on HTTP response
 *
 * @param res - HTTP ServerResponse object
 * @param settings - CORS configuration settings
 *
 * @example
 * ```typescript
 * setCorsHeaders(res, { allowCrossDomain: true });
 * ```
 */
export function setCorsHeaders(res: ServerResponse, settings: CorsSettings): void {
  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
  }
}

/**
 * Set CORS headers with max age for preflight caching
 *
 * @param res - HTTP ServerResponse object
 * @param settings - CORS configuration settings
 * @param maxAge - Max age in seconds for preflight cache (default: 86400 = 24 hours)
 *
 * @example
 * ```typescript
 * setCorsHeadersWithMaxAge(res, { allowCrossDomain: true }, 86400);
 * ```
 */
export function setCorsHeadersWithMaxAge(
  res: ServerResponse,
  settings: CorsSettings,
  maxAge = 86400
): void {
  setCorsHeaders(res, settings);

  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Max-Age', maxAge.toString());
  }
}
