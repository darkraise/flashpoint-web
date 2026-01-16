import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authApi } from '../lib/api';
import { LoginCredentials, RegisterData } from '../types/auth';

interface AuthContextType {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAsGuest: () => void;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setAuth, setGuestMode, clearAuth, refreshToken, updateAccessToken } = useAuthStore();
  const navigate = useNavigate();

  /**
   * Login function
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const result = await authApi.login(credentials);
      setAuth(result.user, result.tokens);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [setAuth]);

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
      console.error('Registration failed:', error);
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
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      navigate('/login');
    }
  }, [refreshToken, clearAuth, navigate]);

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
      console.error('Token refresh failed:', error);
      clearAuth();
      navigate('/login');
      throw error;
    }
  }, [refreshToken, updateAccessToken, clearAuth, navigate]);

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
    refreshAccessToken
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
