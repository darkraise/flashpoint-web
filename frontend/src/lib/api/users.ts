import { apiClient } from './client';
import type {
  UsersResponse,
  UserDetails,
  CreateUserData,
  UpdateUserData,
  ChangePasswordData,
} from '@/types/auth';

/**
 * Users API
 *
 * Manages user accounts, settings, and theme preferences
 */
export const usersApi = {
  /**
   * Get all users with pagination
   */
  getAll: async (page = 1, limit = 50): Promise<UsersResponse> => {
    const { data } = await apiClient.get<UsersResponse>('/users', {
      params: { page, limit },
    });
    return data;
  },

  /**
   * Get user by ID
   */
  getById: async (id: number): Promise<UserDetails> => {
    const { data } = await apiClient.get<UserDetails>(`/users/${id}`);
    return data;
  },

  /**
   * Create a new user
   */
  create: async (userData: CreateUserData): Promise<UserDetails> => {
    const { data } = await apiClient.post<UserDetails>('/users', userData);
    return data;
  },

  /**
   * Update user information
   */
  update: async (id: number, userData: UpdateUserData): Promise<UserDetails> => {
    const { data } = await apiClient.patch<UserDetails>(`/users/${id}`, userData);
    return data;
  },

  /**
   * Delete a user
   */
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },

  /**
   * Change user password
   */
  changePassword: async (
    id: number,
    passwordData: ChangePasswordData
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/users/${id}/change-password`, passwordData);
    return data;
  },

  /**
   * Get user theme (legacy - kept for backward compatibility)
   */
  getTheme: async (): Promise<{ themeColor: string; surfaceColor: string }> => {
    const { data } = await apiClient.get('/users/me/theme');
    return data;
  },

  /**
   * Update user theme (legacy - kept for backward compatibility)
   */
  updateTheme: async (
    themeColor: string,
    surfaceColor: string
  ): Promise<{ success: boolean; themeColor: string; surfaceColor: string }> => {
    const { data } = await apiClient.patch('/users/me/theme', { themeColor, surfaceColor });
    return data;
  },

  /**
   * Get theme settings from generic settings
   */
  getThemeSettings: async (): Promise<{ mode: string; primaryColor: string }> => {
    const settings = await usersApi.getAllSettings();
    return {
      mode: settings.theme_mode || 'dark',
      primaryColor: settings.primary_color || 'blue',
    };
  },

  /**
   * Update theme settings in generic settings
   */
  updateThemeSettings: async (
    mode: string,
    primaryColor: string
  ): Promise<{ mode: string; primaryColor: string }> => {
    await usersApi.updateSettings({
      theme_mode: mode,
      primary_color: primaryColor,
    });
    return { mode, primaryColor };
  },

  /**
   * Get all user settings
   */
  getAllSettings: async (): Promise<Record<string, string>> => {
    const { data } = await apiClient.get('/users/me/settings');
    return data;
  },

  /**
   * Update user settings
   */
  updateSettings: async (settings: Record<string, string>): Promise<Record<string, string>> => {
    const { data } = await apiClient.patch('/users/me/settings', settings);
    return data;
  },
};
