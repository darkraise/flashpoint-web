interface PaginationDefaults {
  limit?: number;
  maxLimit?: number;
  offset?: number;
}

interface PaginationResult {
  limit: number;
  offset: number;
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  defaults: PaginationDefaults = {}
): PaginationResult {
  const { limit: defaultLimit = 50, maxLimit = 100, offset: defaultOffset = 0 } = defaults;

  const parsedLimit = parseInt(query.limit as string);
  const limit = isNaN(parsedLimit) ? defaultLimit : Math.min(Math.max(1, parsedLimit), maxLimit);

  const parsedOffset = parseInt(query.offset as string);
  const offset = isNaN(parsedOffset) ? defaultOffset : Math.max(0, parsedOffset);

  return { limit, offset };
}
