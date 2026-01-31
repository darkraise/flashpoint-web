/**
 * Standard pagination response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Create a standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  };
}

/**
 * Calculate offset for database queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate and normalize pagination parameters
 */
export function normalizePagination(
  page?: number | string,
  limit?: number | string,
  defaultLimit: number = 50,
  maxLimit: number = 100
): { page: number; limit: number } {
  let normalizedPage = typeof page === 'string' ? parseInt(page) : page;
  let normalizedLimit = typeof limit === 'string' ? parseInt(limit) : limit;

  // Ensure page is at least 1
  normalizedPage = Math.max(1, normalizedPage || 1);

  // Ensure limit is within bounds
  normalizedLimit = Math.min(
    maxLimit,
    Math.max(1, normalizedLimit || defaultLimit)
  );

  return {
    page: normalizedPage,
    limit: normalizedLimit
  };
}
