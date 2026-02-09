import { apiClient } from './client';
import type { AuthSettings, UpdateAuthSettingsData } from '@/types/auth';
import type { SystemSettings, PublicSettings } from '@/types/settings';

export const authSettingsApi = {
  get: async (): Promise<AuthSettings> => {
    const { data } = await apiClient.get<AuthSettings>('/settings/auth');
    return data;
  },

  update: async (settings: UpdateAuthSettingsData): Promise<AuthSettings> => {
    const { data } = await apiClient.patch<AuthSettings>('/settings/auth', settings);
    return data;
  },
};

export const systemSettingsApi = {
  getAll: async (): Promise<SystemSettings> => {
    const { data } = await apiClient.get<SystemSettings>('/settings');
    return data;
  },

  getPublic: async (): Promise<PublicSettings> => {
    const { data } = await apiClient.get<PublicSettings>('/settings/public');
    return data;
  },

  getCategory: async (category: string): Promise<Record<string, unknown>> => {
    const { data } = await apiClient.get<Record<string, unknown>>(`/settings/${category}`);
    return data;
  },

  updateCategory: async (
    category: string,
    settings: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const { data } = await apiClient.patch<Record<string, unknown>>(
      `/settings/${category}`,
      settings
    );
    return data;
  },

  getSetting: async (category: string, key: string): Promise<{ value: unknown }> => {
    const { data } = await apiClient.get<{ value: unknown }>(`/settings/${category}/${key}`);
    return data;
  },

  updateSetting: async (
    category: string,
    key: string,
    value: unknown
  ): Promise<{ value: unknown }> => {
    const { data } = await apiClient.patch<{ value: unknown }>(`/settings/${category}/${key}`, {
      value,
    });
    return data;
  },

  getCacheStats: async (): Promise<{
    keyCount: number;
    categoryCount: number;
    hitRate: number;
    size: number;
  }> => {
    const { data } = await apiClient.get('/settings/_cache/stats');
    return data;
  },

  clearCache: async (category?: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/settings/_cache/clear', { category });
    return data;
  },
};
