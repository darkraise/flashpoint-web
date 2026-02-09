import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const DEFAULT_TIMEOUT_MS = 30000;

/** Terminates requests that exceed the specified timeout, preventing hanging connections. */
export function requestTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    let isTimedOut = false;
    let hasResponded = false;

    const timeoutId = setTimeout(() => {
      isTimedOut = true;

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

export const TimeoutConfig = {
  DEFAULT: 30000,
  SHORT: 10000,
  MEDIUM: 60000,
  LONG: 120000,
  EXTENDED: 300000,
};
