import { apiClient } from './client';
import type {
  ActivitiesResponse,
  ActivityFilters,
  ActivityStatsResponse,
  ActivityTrendResponse,
  TopActionsResponse,
  ActivityBreakdownResponse,
  TimeRange,
} from '@/types/auth';

/**
 * Activities API
 *
 * Manages activity logging and analytics
 */
export const activitiesApi = {
  /**
   * Get all activities with pagination and filtering
   */
  getAll: async (
    page = 1,
    limit = 50,
    filters?: ActivityFilters
  ): Promise<ActivitiesResponse> => {
    const { data } = await apiClient.get<ActivitiesResponse>('/activities', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  /**
   * Get activity statistics for a time range
   */
  getStats: async (
    timeRange: TimeRange = '24h',
    customRange?: { startDate?: string; endDate?: string }
  ): Promise<ActivityStatsResponse> => {
    const { data } = await apiClient.get<ActivityStatsResponse>('/activities/stats', {
      params: { timeRange, ...customRange },
    });
    return data;
  },

  /**
   * Get activity trend over days
   */
  getTrend: async (days = 7): Promise<ActivityTrendResponse> => {
    const { data } = await apiClient.get<ActivityTrendResponse>('/activities/trend', {
      params: { days },
    });
    return data;
  },

  /**
   * Get top actions by frequency
   */
  getTopActions: async (
    limit = 10,
    timeRange: TimeRange = '24h'
  ): Promise<TopActionsResponse> => {
    const { data } = await apiClient.get<TopActionsResponse>('/activities/top-actions', {
      params: { limit, timeRange },
    });
    return data;
  },

  /**
   * Get activity breakdown by resource, user, or IP
   */
  getBreakdown: async (
    groupBy: 'resource' | 'user' | 'ip',
    limit = 10,
    timeRange: TimeRange = '24h'
  ): Promise<ActivityBreakdownResponse> => {
    const { data } = await apiClient.get<ActivityBreakdownResponse>('/activities/breakdown', {
      params: { groupBy, limit, timeRange },
    });
    return data;
  },
};
