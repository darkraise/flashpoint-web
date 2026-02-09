import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useSharedAccessStore } from '@/store/sharedAccess';

/**
 * Base axios instance for API calls
 *
 * All API modules should use this instance to ensure consistent:
 * - Base URL configuration
 * - Request/response interceptors
 * - Authentication handling (via HTTP-only cookies)
 * - Error handling
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send HTTP-only cookies with every request
});

// ===================================
// Request Interceptor
// ===================================

/**
 * Adds SharedAccess token header for unauthenticated shared playlist access.
 * Regular auth uses HTTP-only cookies (sent automatically via withCredentials).
 */
apiClient.interceptors.request.use(
  (config) => {
    // Only set SharedAccess header for unauthenticated users on shared playlists.
    // Authenticated users rely on the HTTP-only access token cookie.
    if (!useAuthStore.getState().isAuthenticated) {
      const sharedToken = useSharedAccessStore.getState().getToken();
      if (sharedToken) {
        config.headers.Authorization = `SharedAccess ${sharedToken}`;
      }
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
 * requests receive 401 errors simultaneously.
 * With HTTP-only cookies, subscribers just need to know refresh succeeded
 * — the new cookie is set automatically by the refresh response.
 */
let isRefreshing = false;
let refreshSubscribers: { resolve: () => void; reject: (error: unknown) => void }[] = [];

function subscribeTokenRefresh(resolve: () => void, reject: (error: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}

function onTokenRefreshed() {
  refreshSubscribers.forEach((sub) => sub.resolve());
  refreshSubscribers = [];
}

function onTokenRefreshFailed(error: unknown) {
  refreshSubscribers.forEach((sub) => sub.reject(error));
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
 * - Retry failed requests after token refresh (cookie updated automatically)
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
      toast.error('Network error. Please check your connection.', { id: 'network-error' });
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Handle 404 errors - only show toast for unexpected 404s
    // Skip for endpoints that commonly return 404 as a normal response
    if (status === 404 && !originalRequest._skip404Toast) {
      toast.error('Resource not found', { id: 'not-found' });
    }

    // Handle 500+ errors (server errors) - show toast notification
    if (status >= 500) {
      toast.error('Server error occurred. Please try again later.', { id: 'server-error' });
    }

    // If error is 401 and we haven't retried yet
    if (status === 401 && !originalRequest._retry) {
      const errorCode = error.response.data?.code;

      // Handle shared access token errors differently
      if (errorCode === 'SHARED_ACCESS_INVALID') {
        useSharedAccessStore.getState().clearToken();
        toast.error('Your shared access has expired. Return to the playlist to continue browsing.');
        // Don't redirect to login for shared access - let the UI handle it
        return Promise.reject(error);
      }

      // Don't retry the refresh endpoint itself (prevents infinite loop)
      if (originalRequest.url?.includes('/auth/refresh')) {
        toast.error('Session expired. Please log in again.');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If a token refresh is already in progress, wait for it
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(() => {
            // Cookie was updated by the refresh response — just retry
            resolve(apiClient(originalRequest));
          }, reject);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (!useAuthStore.getState().isAuthenticated) {
          toast.error('Session expired. Please log in again.');
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Refresh the token — cookies sent/updated automatically
        await apiClient.post('/auth/refresh');

        // Notify all waiting requests that refresh succeeded
        onTokenRefreshed();

        // Retry the original request — new cookie sent automatically
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Notify all waiting requests of the error
        onTokenRefreshFailed(refreshError);

        // Refresh failed, clear auth and redirect to login
        toast.error('Session expired. Please log in again.');
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
