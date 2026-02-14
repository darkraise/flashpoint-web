import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { authApi } from '../lib/api';
import { apiClient } from '../lib/api/client';
import { LoginCredentials, RegisterData } from '../types/auth';
import { PublicSettings } from '../types/settings';
import { logger } from '../lib/logger';

interface AuthContextType {
  login: (credentials: LoginCredentials, redirectPath?: string) => Promise<void>;
  loginAsGuest: (redirectPath?: string) => void;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  checkMaintenanceMode: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setAuth, setGuestMode, clearAuth, isAuthenticated, setMaintenanceMode } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /** Check maintenance mode, preferring React Query cache over a fresh API call */
  const checkMaintenanceMode = useCallback(async (): Promise<boolean> => {
    try {
      const cachedData = queryClient.getQueryData<PublicSettings>(['system-settings', 'public']);

      if (cachedData) {
        logger.debug('[AuthContext] Using cached maintenance mode data');
        const isMaintenanceActive = cachedData.app?.maintenanceMode === true;
        setMaintenanceMode(isMaintenanceActive);
        return isMaintenanceActive;
      }

      logger.warn('[AuthContext] Cache miss! Making authenticated API call to /settings/public');
      const response = await apiClient.get('/settings/public');
      const isMaintenanceActive = response.data.app?.maintenanceMode === true;
      setMaintenanceMode(isMaintenanceActive);
      return isMaintenanceActive;
    } catch (error) {
      logger.error('Failed to check maintenance mode:', error);
      return false;
    }
  }, [setMaintenanceMode, queryClient]);

  const login = useCallback(
    async (credentials: LoginCredentials, redirectPath?: string) => {
      try {
        const result = await authApi.login(credentials);

        // Clear user-specific cached queries, but keep public settings (not user-specific)
        queryClient.removeQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return !(queryKey[0] === 'system-settings' && queryKey[1] === 'public');
          },
        });

        setAuth(result.user);

        const isMaintenanceActive = await checkMaintenanceMode();
        const isAdmin = result.user.permissions?.includes('settings.update');

        if (isMaintenanceActive && !isAdmin) {
          navigate('/maintenance', { replace: true });
          return;
        }

        navigate(redirectPath || '/', { replace: true });
      } catch (error) {
        logger.error('Login failed:', error);
        throw error;
      }
    },
    [setAuth, queryClient, checkMaintenanceMode, navigate]
  );

  const loginAsGuest = useCallback(
    (redirectPath?: string) => {
      setGuestMode();
      navigate(redirectPath || '/', { replace: true });
    },
    [setGuestMode, navigate]
  );

  const register = useCallback(
    async (userData: RegisterData) => {
      try {
        const result = await authApi.register(userData);
        setAuth(result.user);
      } catch (error) {
        logger.error('Registration failed:', error);
        throw error;
      }
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Clear user-specific cached queries, but keep public settings (not user-specific)
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return !(queryKey[0] === 'system-settings' && queryKey[1] === 'public');
        },
      });
      clearAuth();
      navigate('/login');
    }
  }, [clearAuth, navigate, queryClient]);

  /** Both cookies (access + refresh) are rotated automatically by the backend. */
  const refreshAccessToken = useCallback(async () => {
    try {
      await authApi.refreshToken();
    } catch (error) {
      logger.error('Token refresh failed:', error);
      clearAuth();
      throw error;
    }
  }, [clearAuth]);

  // Refresh every 50 minutes (access tokens expire in 1 hour)
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(
      () => {
        refreshAccessToken().catch(() => {});
      },
      50 * 60 * 1000 // 50 minutes
    );

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshAccessToken]);

  const value: AuthContextType = {
    login,
    loginAsGuest,
    register,
    logout,
    refreshAccessToken,
    checkMaintenanceMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
