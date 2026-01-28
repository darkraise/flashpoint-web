import { apiClient } from './client';

/**
 * Statistics API
 *
 * Retrieves global statistics and analytics
 */
export const statisticsApi = {
  /**
   * Get all system statistics
   */
  getStatistics: async () => {
    const { data } = await apiClient.get('/statistics');
    return data;
  },
};
