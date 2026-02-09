import { apiClient } from './client';
import type {
  LoginCredentials,
  RegisterData,
  LoginResponse,
  RegisterResponse,
  User,
} from '@/types/auth';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', userData);
    return data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },

  refreshToken: async (): Promise<{ expiresIn: number }> => {
    const { data } = await apiClient.post<{ expiresIn: number }>('/auth/refresh');
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  getSetupStatus: async (): Promise<{ needsSetup: boolean; message: string }> => {
    const { data } = await apiClient.get<{ needsSetup: boolean; message: string }>(
      '/auth/setup-status'
    );
    return data;
  },
};
