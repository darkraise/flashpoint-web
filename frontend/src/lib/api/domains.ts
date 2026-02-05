import { apiClient } from './client';
import type { Domain } from '@/types/settings';

/**
 * Domains API
 *
 * Manages custom domains for playlist sharing and CORS
 */
export const domainsApi = {
  /**
   * Get all configured domains
   */
  getAll: async (): Promise<Domain[]> => {
    const { data } = await apiClient.get<Domain[]>('/domains');
    return data;
  },

  /**
   * Add a new domain
   */
  add: async (hostname: string): Promise<Domain> => {
    const { data } = await apiClient.post<Domain>('/domains', { hostname });
    return data;
  },

  /**
   * Delete a domain
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/domains/${id}`);
  },

  /**
   * Set a domain as the default
   */
  setDefault: async (id: number): Promise<Domain> => {
    const { data } = await apiClient.patch<Domain>(`/domains/${id}/default`);
    return data;
  },
};
