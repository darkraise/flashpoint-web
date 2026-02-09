import { apiClient } from './client';

export const tagsApi = {
  getAll: async (): Promise<Array<{ name: string; count: number }>> => {
    const { data } = await apiClient.get('/tags');
    return data;
  },
};
