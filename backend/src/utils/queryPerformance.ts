import { logger } from './logger';

/**
 * Query Performance Logger
 *
 * Wraps database query execution with performance monitoring.
 * Logs queries that exceed the threshold with execution time and details.
 */

// Performance threshold in milliseconds
const SLOW_QUERY_THRESHOLD_MS = 100;

interface QueryMetrics {
  sql: string;
  params?: any[];
  executionTime: number;
  timestamp: string;
}

/**
 * Sanitize query parameters for logging
 * Redacts sensitive values like passwords and tokens
 */
function sanitizeParams(params: any[] = []): any[] {
  return params.map((param) => {
    if (typeof param === 'string') {
      // Redact if it looks like a password or token
      if (param.length > 20 && /^[a-f0-9]{32,}$/i.test(param)) {
        return '[REDACTED_TOKEN]';
      }
      if (param.length > 50) {
        return '[REDACTED_LONG_STRING]';
      }
    }
    return param;
  });
}

/**
 * Truncate SQL query for logging (keep first 200 chars)
 */
function truncateSQL(sql: string): string {
  const maxLength = 200;
  if (sql.length <= maxLength) {
    return sql;
  }
  return sql.substring(0, maxLength) + '...';
}

/**
 * Log slow query performance metrics
 */
function logSlowQuery(metrics: QueryMetrics): void {
  const { sql, params, executionTime, timestamp } = metrics;

  logger.warn('[Query Performance] Slow query detected', {
    executionTime: `${executionTime}ms`,
    threshold: `${SLOW_QUERY_THRESHOLD_MS}ms`,
    sql: truncateSQL(sql),
    params: sanitizeParams(params),
    timestamp,
  });
}

/**
 * Wrap a database query execution function with performance monitoring
 *
 * @param queryFn - The function that executes the database query
 * @param sql - The SQL query string
 * @param params - Query parameters
 * @returns The result of the query function
 */
export function measureQueryPerformance<T>(queryFn: () => T, sql: string, params: any[] = []): T {
  const start = performance.now();

  try {
    const result = queryFn();
    const executionTime = Math.round(performance.now() - start);

    // Log if query exceeded threshold
    if (executionTime >= SLOW_QUERY_THRESHOLD_MS) {
      logSlowQuery({
        sql,
        params,
        executionTime,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  } catch (error) {
    const executionTime = Math.round(performance.now() - start);

    // Log error with execution time
    logger.error('[Query Performance] Query failed', {
      executionTime: `${executionTime}ms`,
      sql: truncateSQL(sql),
      params: sanitizeParams(params),
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Get current performance threshold in milliseconds
 */
export function getSlowQueryThreshold(): number {
  return SLOW_QUERY_THRESHOLD_MS;
}

/**
 * Async version of measureQueryPerformance for async operations
 */
export async function measureQueryPerformanceAsync<T>(
  queryFn: () => Promise<T>,
  sql: string,
  params: any[] = []
): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const executionTime = Math.round(performance.now() - start);

    // Log if query exceeded threshold
    if (executionTime >= SLOW_QUERY_THRESHOLD_MS) {
      logSlowQuery({
        sql,
        params,
        executionTime,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  } catch (error) {
    const executionTime = Math.round(performance.now() - start);

    // Log error with execution time
    logger.error('[Query Performance] Query failed', {
      executionTime: `${executionTime}ms`,
      sql: truncateSQL(sql),
      params: sanitizeParams(params),
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
