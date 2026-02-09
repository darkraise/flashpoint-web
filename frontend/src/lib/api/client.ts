import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useSharedAccessStore } from '@/store/sharedAccess';

/** Shared axios instance — all API modules must use this for auth and error handling. */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add SharedAccess token for unauthenticated shared playlist access.
// Authenticated users rely on the HTTP-only cookie instead.
apiClient.interceptors.request.use(
  (config) => {
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

// Token refresh queue — when multiple requests get 401 simultaneously,
// only one refresh is issued; the rest wait and retry after it succeeds.
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    if (!error.response) {
      toast.error('Network error. Please check your connection.', { id: 'network-error' });
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 404 && !originalRequest._skip404Toast) {
      toast.error('Resource not found', { id: 'not-found' });
    }

    if (status >= 500) {
      toast.error('Server error occurred. Please try again later.', { id: 'server-error' });
    }

    if (status === 401 && !originalRequest._retry) {
      const errorCode = error.response.data?.code;

      if (errorCode === 'SHARED_ACCESS_INVALID') {
        useSharedAccessStore.getState().clearToken();
        toast.error('Your shared access has expired. Return to the playlist to continue browsing.');
        return Promise.reject(error);
      }

      // Don't retry the refresh endpoint itself (prevents infinite loop)
      if (originalRequest.url?.includes('/auth/refresh')) {
        toast.error('Session expired. Please log in again.');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(() => {
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

        await apiClient.post('/auth/refresh');
        onTokenRefreshed();
        return apiClient(originalRequest);
      } catch (refreshError) {
        onTokenRefreshFailed(refreshError);
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
