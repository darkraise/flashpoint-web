import { apiClient } from './client';
import type { AuthSettings, UpdateAuthSettingsData } from '@/types/auth';
import type { SystemSettings, PublicSettings } from '@/types/settings';

/**
 * Auth Settings API
 *
 * Manages authentication and registration settings
 */
export const authSettingsApi = {
  /**
   * Get authentication settings
   */
  get: async (): Promise<AuthSettings> => {
    const { data } = await apiClient.get<AuthSettings>('/settings/auth');
    return data;
  },

  /**
   * Update authentication settings
   */
  update: async (settings: UpdateAuthSettingsData): Promise<AuthSettings> => {
    const { data } = await apiClient.patch<AuthSettings>('/settings/auth', settings);
    return data;
  },
};

/**
 * System Settings API
 *
 * Manages global system configuration and settings
 */
export const systemSettingsApi = {
  /**
   * Get all system settings
   */
  getAll: async (): Promise<SystemSettings> => {
    const { data } = await apiClient.get<SystemSettings>('/settings');
    return data;
  },

  /**
   * Get public settings (no authentication required)
   */
  getPublic: async (): Promise<PublicSettings> => {
    const { data } = await apiClient.get<PublicSettings>('/settings/public');
    return data;
  },

  /**
   * Get settings for a specific category
   */
  getCategory: async (category: string): Promise<Record<string, unknown>> => {
    const { data } = await apiClient.get<Record<string, unknown>>(`/settings/${category}`);
    return data;
  },

  /**
   * Update settings for a specific category
   */
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

  /**
   * Get a single setting value
   */
  getSetting: async (category: string, key: string): Promise<{ value: unknown }> => {
    const { data } = await apiClient.get<{ value: unknown }>(`/settings/${category}/${key}`);
    return data;
  },

  /**
   * Update a single setting value
   */
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

  /**
   * Get cache statistics
   */
  getCacheStats: async (): Promise<{
    keyCount: number;
    categoryCount: number;
    hitRate: number;
    size: number;
  }> => {
    const { data } = await apiClient.get('/settings/_cache/stats');
    return data;
  },

  /**
   * Clear settings cache
   */
  clearCache: async (category?: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/settings/_cache/clear', { category });
    return data;
  },
};
