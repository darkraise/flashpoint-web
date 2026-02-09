import { apiClient } from './client';

export const statisticsApi = {
  getStatistics: async () => {
    const { data } = await apiClient.get('/statistics');
    return data;
  },
};
