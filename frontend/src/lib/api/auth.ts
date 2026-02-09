import { apiClient } from './client';
import type {
  LoginCredentials,
  RegisterData,
  LoginResponse,
  RegisterResponse,
  User,
} from '@/types/auth';

/**
 * Authentication API
 *
 * Handles user authentication, registration, and session management
 */
export const authApi = {
  /**
   * Login with username and password
   * Returns access token and refresh token
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  /**
   * Register a new user account
   */
  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', userData);
    return data;
  },

  /**
   * Logout and invalidate refresh token
   */
  logout: async (): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },

  /**
   * Refresh access token using refresh token
   * Both tokens are updated via HTTP-only cookies automatically.
   */
  refreshToken: async (): Promise<{ expiresIn: number }> => {
    const { data } = await apiClient.post<{ expiresIn: number }>('/auth/refresh');
    return data;
  },

  /**
   * Get current authenticated user details
   */
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  /**
   * Check if initial setup is required
   * Public endpoint that returns setup status
   */
  getSetupStatus: async (): Promise<{ needsSetup: boolean; message: string }> => {
    const { data } = await apiClient.get<{ needsSetup: boolean; message: string }>(
      '/auth/setup-status'
    );
    return data;
  },
};
