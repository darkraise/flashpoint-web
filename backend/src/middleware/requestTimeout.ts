import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Default timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Request timeout middleware
 *
 * Terminates requests that exceed the specified timeout duration.
 * Prevents hanging requests from consuming server resources.
 *
 * Features:
 * - Configurable timeout per route or globally
 * - Automatic cleanup of timed-out requests
 * - Detailed logging for debugging
 * - 408 Request Timeout status code
 *
 * Usage:
 * ```typescript
 * // Global timeout (30s default)
 * app.use(requestTimeout());
 *
 * // Custom timeout (60s)
 * app.use(requestTimeout(60000));
 *
 * // Per-route timeout
 * router.get('/slow-endpoint', requestTimeout(120000), handler);
 * ```
 */
export function requestTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    let isTimedOut = false;
    let hasResponded = false;

    // Set up timeout handler
    const timeoutId = setTimeout(() => {
      isTimedOut = true;

      // Only send response if not already sent
      if (!hasResponded && !res.headersSent) {
        const elapsed = Date.now() - startTime;

        logger.warn('[Request Timeout] Request exceeded timeout', {
          method: req.method,
          url: req.url,
          timeout: `${timeoutMs}ms`,
          elapsed: `${elapsed}ms`,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });

        res.status(408).json({
          error: {
            message: 'Request timeout',
            statusCode: 408,
            timeout: timeoutMs,
            details: 'The server took too long to respond. Please try again.',
          },
        });

        hasResponded = true;
      }
    }, timeoutMs);

    // Override res.send/json/end to clear timeout on response
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    res.send = function (body?: any) {
      clearTimeoutAndLog();
      return originalSend(body);
    };

    res.json = function (body?: any) {
      clearTimeoutAndLog();
      return originalJson(body);
    };

    res.end = function (chunk?: any, encoding?: any, callback?: any) {
      clearTimeoutAndLog();
      return originalEnd(chunk, encoding, callback);
    };

    function clearTimeoutAndLog() {
      if (!hasResponded) {
        hasResponded = true;
        clearTimeout(timeoutId);

        const elapsed = Date.now() - startTime;

        // Log slow requests (>50% of timeout) for monitoring
        if (elapsed > timeoutMs * 0.5 && !isTimedOut) {
          logger.warn('[Slow Request] Request took over 50% of timeout', {
            method: req.method,
            url: req.url,
            elapsed: `${elapsed}ms`,
            timeout: `${timeoutMs}ms`,
            percentage: `${Math.round((elapsed / timeoutMs) * 100)}%`,
          });
        }
      }
    }

    // Handle request abortion
    req.on('close', () => {
      if (!hasResponded) {
        hasResponded = true;
        clearTimeout(timeoutId);

        if (isTimedOut) {
          logger.info('[Request Aborted] Client closed connection after timeout', {
            method: req.method,
            url: req.url,
          });
        }
      }
    });

    next();
  };
}

/**
 * Timeout configurations for different endpoint types
 */
export const TimeoutConfig = {
  /** Default timeout for most endpoints (30s) */
  DEFAULT: 30000,

  /** Short timeout for fast operations (10s) */
  SHORT: 10000,

  /** Medium timeout for database queries (60s) */
  MEDIUM: 60000,

  /** Long timeout for file operations (120s) */
  LONG: 120000,

  /** Extended timeout for batch operations (300s / 5 minutes) */
  EXTENDED: 300000,
};
