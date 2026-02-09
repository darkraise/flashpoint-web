import { apiClient } from './client';
import type {
  UsersResponse,
  UserDetails,
  CreateUserData,
  UpdateUserData,
  ChangePasswordData,
} from '@/types/auth';

export const usersApi = {
  getAll: async (page = 1, limit = 50): Promise<UsersResponse> => {
    const { data } = await apiClient.get<UsersResponse>('/users', {
      params: { page, limit },
    });
    return data;
  },

  getById: async (id: number): Promise<UserDetails> => {
    const { data } = await apiClient.get<UserDetails>(`/users/${id}`);
    return data;
  },

  create: async (userData: CreateUserData): Promise<UserDetails> => {
    const { data } = await apiClient.post<UserDetails>('/users', userData);
    return data;
  },

  update: async (id: number, userData: UpdateUserData): Promise<UserDetails> => {
    const { data } = await apiClient.patch<UserDetails>(`/users/${id}`, userData);
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },

  changePassword: async (
    id: number,
    passwordData: ChangePasswordData
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/users/${id}/change-password`, passwordData);
    return data;
  },

  /** Legacy - kept for backward compatibility */
  getTheme: async (): Promise<{ themeColor: string; surfaceColor: string }> => {
    const { data } = await apiClient.get('/users/me/theme');
    return data;
  },

  /** Legacy - kept for backward compatibility */
  updateTheme: async (
    themeColor: string,
    surfaceColor: string
  ): Promise<{ success: boolean; themeColor: string; surfaceColor: string }> => {
    const { data } = await apiClient.patch('/users/me/theme', { themeColor, surfaceColor });
    return data;
  },

  getThemeSettings: async (): Promise<{ mode: string; primaryColor: string }> => {
    const settings = await usersApi.getAllSettings();
    return {
      mode: settings.theme_mode || 'dark',
      primaryColor: settings.primary_color || 'blue',
    };
  },

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

  getAllSettings: async (): Promise<Record<string, string>> => {
    const { data } = await apiClient.get('/users/me/settings');
    return data;
  },

  updateSettings: async (settings: Record<string, string>): Promise<Record<string, string>> => {
    const { data } = await apiClient.patch('/users/me/settings', settings);
    return data;
  },
};
