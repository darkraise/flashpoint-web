import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '@/lib/api';
import {
  ActivityFilters,
  TimeRange,
  ActivitiesResponse,
  ActivityStatsResponse,
  ActivityTrendResponse,
  TopActionsResponse,
  ActivityBreakdownResponse,
} from '@/types/auth';

export function useActivities(page = 1, limit = 50, filters?: ActivityFilters) {
  return useQuery<ActivitiesResponse>({
    queryKey: ['activities', page, limit, filters],
    queryFn: () => activitiesApi.getAll(page, limit, filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useActivityStats(
  timeRange: TimeRange = '24h',
  customRange?: { startDate?: string; endDate?: string },
  autoRefresh = false
) {
  return useQuery<ActivityStatsResponse>({
    queryKey: ['activity-stats', timeRange, customRange],
    queryFn: () => activitiesApi.getStats(timeRange, customRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: autoRefresh ? 30 * 1000 : false,
    refetchOnWindowFocus: false,
  });
}

export function useActivityTrend(days = 7, autoRefresh = false) {
  return useQuery<ActivityTrendResponse>({
    queryKey: ['activity-trend', days],
    queryFn: () => activitiesApi.getTrend(days),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: autoRefresh ? 30 * 1000 : false,
    refetchOnWindowFocus: false,
  });
}

export function useTopActions(limit = 10, timeRange: TimeRange = '24h', autoRefresh = false) {
  return useQuery<TopActionsResponse>({
    queryKey: ['top-actions', limit, timeRange],
    queryFn: () => activitiesApi.getTopActions(limit, timeRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: autoRefresh ? 30 * 1000 : false,
    refetchOnWindowFocus: false,
  });
}

export function useActivityBreakdown(
  groupBy: 'resource' | 'user' | 'ip',
  limit = 10,
  timeRange: TimeRange = '24h',
  autoRefresh = false
) {
  return useQuery<ActivityBreakdownResponse>({
    queryKey: ['activity-breakdown', groupBy, limit, timeRange],
    queryFn: () => activitiesApi.getBreakdown(groupBy, limit, timeRange),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: autoRefresh ? 30 * 1000 : false,
    refetchOnWindowFocus: false,
  });
}
