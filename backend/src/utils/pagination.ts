export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

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
      totalPages,
    },
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function normalizePagination(
  page?: number | string,
  limit?: number | string,
  defaultLimit: number = 50,
  maxLimit: number = 100
): { page: number; limit: number } {
  let normalizedPage = typeof page === 'string' ? parseInt(page) : page;
  let normalizedLimit = typeof limit === 'string' ? parseInt(limit) : limit;

  normalizedPage = Math.max(1, normalizedPage || 1);
  normalizedLimit = Math.min(maxLimit, Math.max(1, normalizedLimit || defaultLimit));

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}
