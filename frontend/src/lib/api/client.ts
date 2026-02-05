import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { useSharedAccessStore } from '@/store/sharedAccess';
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
 * Adds authentication token to all outgoing requests
 * Priority: 1) Regular JWT Bearer token, 2) Shared access token
 */
apiClient.interceptors.request.use(
  (config) => {
    // First, try regular JWT token
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }

    // Second, try shared access token
    const sharedToken = useSharedAccessStore.getState().getToken();
    if (sharedToken) {
      config.headers.Authorization = `SharedAccess ${sharedToken}`;
      return config;
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
 * Token refresh queue to prevent race conditions when multiple
 * requests receive 401 errors simultaneously
 */
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Handles response errors and automatic token refresh
 *
 * Features:
 * - Network error notifications
 * - 404 error notifications
 * - 500+ server error notifications
 * - Automatic token refresh on 401 errors with queue support
 * - Retry failed requests after token refresh
 * - Logout on refresh failure
 * - Prevents duplicate refresh requests via isRefreshing flag
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle request cancellation - don't show errors for aborted requests
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

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
      const errorCode = error.response.data?.code;

      // Handle shared access token errors differently
      if (
        errorCode === 'SHARED_ACCESS_INVALID' ||
        originalRequest.headers?.Authorization?.startsWith('SharedAccess ')
      ) {
        useSharedAccessStore.getState().clearToken();
        const { toast } = await import('sonner');
        toast.error('Your shared access has expired. Return to the playlist to continue browsing.');
        // Don't redirect to login for shared access - let the UI handle it
        return Promise.reject(error);
      }

      // Don't retry the refresh endpoint itself (prevents infinite loop)
      if (originalRequest.url?.includes('/auth/refresh')) {
        const { toast } = await import('sonner');
        toast.error('Session expired. Please login again.');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If a token refresh is already in progress, wait for it
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

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

        // Notify all waiting requests of the new token
        onTokenRefreshed(data.accessToken);

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
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
