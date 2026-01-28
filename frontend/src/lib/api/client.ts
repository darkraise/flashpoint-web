import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import type { AuthTokens } from '@/types/auth';

/**
 * Base axios instance for API calls
 *
 * All API modules should use this instance to ensure consistent:
 * - Base URL configuration
 * - Request/response interceptors
 * - Authentication handling
 * - Error handling
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===================================
// Request Interceptor
// ===================================

/**
 * Adds JWT access token to all outgoing requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===================================
// Response Interceptor
// ===================================

/**
 * Handles response errors and automatic token refresh
 *
 * Features:
 * - Network error notifications
 * - 404 error notifications
 * - 500+ server error notifications
 * - Automatic token refresh on 401 errors
 * - Retry failed requests after token refresh
 * - Logout on refresh failure
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors (no response from server)
    if (!error.response) {
      const { toast } = await import('sonner');
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Handle 404 errors - show toast notification
    if (status === 404) {
      const { toast } = await import('sonner');
      toast.error('Resource not found');
    }

    // Handle 500+ errors (server errors) - show toast notification
    if (status >= 500) {
      const { toast } = await import('sonner');
      toast.error('Server error occurred. Please try again later.');
    }

    // If error is 401 and we haven't retried yet
    if (status === 401 && !originalRequest._retry) {
      // Don't retry the refresh endpoint itself (prevents infinite loop)
      if (originalRequest.url?.includes('/auth/refresh')) {
        const { toast } = await import('sonner');
        toast.error('Session expired. Please login again.');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          // No refresh token available, clear auth and redirect to login
          const { toast } = await import('sonner');
          toast.error('Session expired. Please login again.');
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const { data } = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });

        // Update the access token in the store
        useAuthStore.getState().updateAccessToken(data.accessToken);

        // Update the authorization header and retry the original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        const { toast } = await import('sonner');
        toast.error('Session expired. Please login again.');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
