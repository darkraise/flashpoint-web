/**
 * Pagination Query Parser Utility
 *
 * Provides consistent pagination query parameter parsing across all routes
 */

interface PaginationDefaults {
  limit?: number;
  maxLimit?: number;
  offset?: number;
}

interface PaginationResult {
  limit: number;
  offset: number;
}

/**
 * Parse pagination query parameters with defaults and limits
 *
 * @param query - Express query object
 * @param defaults - Default values for limit, maxLimit, and offset
 * @returns Parsed and validated pagination parameters
 *
 * @example
 * ```typescript
 * const { limit, offset } = parsePaginationQuery(req.query);
 * ```
 *
 * @example
 * ```typescript
 * const { limit, offset } = parsePaginationQuery(req.query, {
 *   limit: 25,
 *   maxLimit: 50,
 *   offset: 0
 * });
 * ```
 */
export function parsePaginationQuery(
  query: any,
  defaults: PaginationDefaults = {}
): PaginationResult {
  const {
    limit: defaultLimit = 50,
    maxLimit = 100,
    offset: defaultOffset = 0,
  } = defaults;

  // Parse limit with default and max cap
  const parsedLimit = parseInt(query.limit as string);
  const limit = isNaN(parsedLimit)
    ? defaultLimit
    : Math.min(parsedLimit, maxLimit);

  // Parse offset with default
  const parsedOffset = parseInt(query.offset as string);
  const offset = isNaN(parsedOffset) ? defaultOffset : Math.max(0, parsedOffset);

  return { limit, offset };
}
