import { logger } from './logger';

const SLOW_QUERY_THRESHOLD_MS = 100;

interface QueryMetrics {
  sql: string;
  params?: unknown[];
  executionTime: number;
  timestamp: string;
}

/** Redacts sensitive values (passwords, tokens) from query params before logging. */
function sanitizeParams(params: unknown[] = []): unknown[] {
  return params.map((param) => {
    if (typeof param === 'string') {
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

function truncateSQL(sql: string): string {
  const maxLength = 200;
  if (sql.length <= maxLength) {
    return sql;
  }
  return sql.substring(0, maxLength) + '...';
}

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

export function measureQueryPerformance<T>(
  queryFn: () => T,
  sql: string,
  params: unknown[] = []
): T {
  const start = performance.now();

  try {
    const result = queryFn();
    const executionTime = Math.round(performance.now() - start);

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

    logger.error('[Query Performance] Query failed', {
      executionTime: `${executionTime}ms`,
      sql: truncateSQL(sql),
      params: sanitizeParams(params),
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

export function getSlowQueryThreshold(): number {
  return SLOW_QUERY_THRESHOLD_MS;
}

export async function measureQueryPerformanceAsync<T>(
  queryFn: () => Promise<T>,
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const executionTime = Math.round(performance.now() - start);

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

    logger.error('[Query Performance] Query failed', {
      executionTime: `${executionTime}ms`,
      sql: truncateSQL(sql),
      params: sanitizeParams(params),
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
