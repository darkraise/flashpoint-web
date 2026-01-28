import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { authApi } from '../lib/api';
import { LoginCredentials, RegisterData } from '../types/auth';
import { PublicSettings } from '../types/settings';
import axios from 'axios';
import { logger } from '../lib/logger';

interface AuthContextType {
  login: (credentials: LoginCredentials, redirectPath?: string) => Promise<void>;
  loginAsGuest: () => void;
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
  const { setAuth, setGuestMode, clearAuth, refreshToken, updateAccessToken, setMaintenanceMode } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /**
   * Check if maintenance mode is enabled
   * Uses React Query cache to avoid duplicate API calls
   */
  const checkMaintenanceMode = useCallback(async (): Promise<boolean> => {
    try {
      // Get from React Query cache instead of making a new API call
      const cachedData = queryClient.getQueryData<PublicSettings>(['system-settings', 'public']);

      if (cachedData) {
        logger.debug('[AuthContext] Using cached maintenance mode data');
        const isMaintenanceActive = cachedData.app?.maintenanceMode === true;
        setMaintenanceMode(isMaintenanceActive);
        return isMaintenanceActive;
      }

      // Fallback: if not in cache, fetch it (shouldn't happen with prefetch)
      logger.warn('[AuthContext] Cache miss! Making direct axios call to /api/settings/public');
      const response = await axios.get('/api/settings/public');
      const isMaintenanceActive = response.data.app?.maintenanceMode === true;
      setMaintenanceMode(isMaintenanceActive);
      return isMaintenanceActive;
    } catch (error) {
      logger.error('Failed to check maintenance mode:', error);
      return false;
    }
  }, [setMaintenanceMode, queryClient]);

  /**
   * Login function
   */
  const login = useCallback(async (credentials: LoginCredentials, redirectPath?: string) => {
    try {
      const result = await authApi.login(credentials);

      // Clear all cached queries EXCEPT public settings when user logs in
      // Public settings are not user-specific and should persist across sessions
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          // Keep public settings in cache
          return !(queryKey[0] === 'system-settings' && queryKey[1] === 'public');
        }
      });

      setAuth(result.user, result.tokens);

      // Check maintenance mode after login
      const isMaintenanceActive = await checkMaintenanceMode();

      // If maintenance mode is active and user is not admin, redirect to maintenance page
      const isAdmin = result.user.permissions?.includes('settings.update');

      if (isMaintenanceActive && !isAdmin) {
        navigate('/maintenance', { replace: true });
        return;
      }

      // Normal login - redirect to requested page or home
      navigate(redirectPath || '/', { replace: true });
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }, [setAuth, queryClient, checkMaintenanceMode, navigate]);

  /**
   * Login as guest function (temporary session)
   */
  const loginAsGuest = useCallback(() => {
    setGuestMode();
    navigate('/');
  }, [setGuestMode, navigate]);

  /**
   * Register function
   */
  const register = useCallback(async (userData: RegisterData) => {
    try {
      const result = await authApi.register(userData);
      setAuth(result.user, result.tokens);
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }, [setAuth]);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      const token = refreshToken;
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Clear all cached queries EXCEPT public settings when user logs out
      // Public settings are not user-specific and should persist across sessions
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          // Keep public settings in cache
          return !(queryKey[0] === 'system-settings' && queryKey[1] === 'public');
        }
      });
      clearAuth();
      navigate('/login');
    }
  }, [refreshToken, clearAuth, navigate, queryClient]);

  /**
   * Refresh access token function
   */
  const refreshAccessToken = useCallback(async () => {
    try {
      const token = refreshToken;
      if (!token) {
        throw new Error('No refresh token available');
      }

      const tokens = await authApi.refreshToken(token);
      updateAccessToken(tokens.accessToken);
    } catch (error) {
      logger.error('Token refresh failed:', error);
      // The axios interceptor will handle logout and redirect
      // Just clear auth here to ensure clean state
      clearAuth();
      throw error;
    }
  }, [refreshToken, updateAccessToken, clearAuth]);

  /**
   * Set up token refresh interval (refresh every 50 minutes)
   * Access tokens expire in 1 hour, so we refresh 10 minutes before expiry
   */
  useEffect(() => {
    if (!refreshToken) return;

    const refreshInterval = setInterval(
      () => {
        refreshAccessToken().catch(() => {
          // Error already handled in refreshAccessToken
        });
      },
      50 * 60 * 1000 // 50 minutes
    );

    return () => clearInterval(refreshInterval);
  }, [refreshToken, refreshAccessToken]);

  const value: AuthContextType = {
    login,
    loginAsGuest,
    register,
    logout,
    refreshAccessToken,
    checkMaintenanceMode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
