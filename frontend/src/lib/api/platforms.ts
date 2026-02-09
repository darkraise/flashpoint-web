import { apiClient } from './client';

export const platformsApi = {
  getAll: async (): Promise<Array<{ platform: string; count: number }>> => {
    const { data } = await apiClient.get('/platforms');
    return data;
  },
};
