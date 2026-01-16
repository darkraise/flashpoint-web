import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '../lib/api';
import { ActivityFilters } from '../types/auth';

/**
 * Hook to fetch activity logs with pagination and filters
 */
export function useActivities(page = 1, limit = 50, filters?: ActivityFilters) {
  return useQuery({
    queryKey: ['activities', page, limit, filters],
    queryFn: () => activitiesApi.getAll(page, limit, filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Refetch on window focus to keep logs up to date
    refetchOnWindowFocus: true
  });
}
