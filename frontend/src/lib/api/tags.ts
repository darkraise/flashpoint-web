import { apiClient } from './client';

/**
 * Tags API
 *
 * Retrieves game tag information and statistics
 */
export const tagsApi = {
  /**
   * Get all tags with game counts
   */
  getAll: async (): Promise<Array<{ name: string; count: number }>> => {
    const { data } = await apiClient.get('/tags');
    return data;
  },
};
