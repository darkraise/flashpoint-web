import { apiClient } from './client';
import type { Domain } from '@/types/settings';

export const domainsApi = {
  getAll: async (): Promise<Domain[]> => {
    const { data } = await apiClient.get<Domain[]>('/domains');
    return data;
  },

  add: async (hostname: string): Promise<Domain> => {
    const { data } = await apiClient.post<Domain>('/domains', { hostname });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/domains/${id}`);
  },

  setDefault: async (id: number): Promise<Domain> => {
    const { data } = await apiClient.patch<Domain>(`/domains/${id}/default`);
    return data;
  },
};
