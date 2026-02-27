import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useLogin, useRegister, useLogout, useCurrentUser } from './useAuth';

// Create hoisted mocks that can be referenced in vi.mock factories
const {
  mockLogin,
  mockRegister,
  mockLogout,
  mockAuthApi,
  mockLogger,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockRegister: vi.fn(),
  mockLogout: vi.fn(),
  mockAuthApi: {
    getMe: vi.fn(),
  },
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
  })),
}));

// Mock the auth API
vi.mock('@/lib/api', () => ({
  authApi: mockAuthApi,
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('useAuth hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  describe('useLogin', () => {
    it('should call login from AuthContext with credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          username: 'testuser',
          password: 'password123',
        });
      });

      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should log error on login failure', async () => {
      const error = new Error('Invalid credentials');
      mockLogin.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            username: 'testuser',
            password: 'wrongpassword',
          });
        } catch {
          // Expected to throw
        }
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Login error:', error);
    });

    it('should set error state on login failure', async () => {
      const error = new Error('Invalid credentials');
      mockLogin.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            username: 'testuser',
            password: 'wrongpassword',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
    });

    it('should set success state on successful login', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          username: 'testuser',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle login with empty credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          username: '',
          password: '',
        });
      });

      expect(mockLogin).toHaveBeenCalledWith({
        username: '',
        password: '',
      });
    });
  });

  describe('useRegister', () => {
    it('should call register from AuthContext with user data', async () => {
      mockRegister.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });
      });

      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('should invalidate setupStatus queries on success', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['setupStatus'] });
    });

    it('should log error on registration failure', async () => {
      const error = new Error('Username already exists');
      mockRegister.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            username: 'existinguser',
            email: 'test@example.com',
            password: 'password123',
          });
        } catch {
          // Expected to throw
        }
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Registration error:', error);
    });

    it('should set error state on registration failure', async () => {
      const error = new Error('Email already exists');
      mockRegister.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            username: 'newuser',
            email: 'existing@example.com',
            password: 'password123',
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
    });

    it('should set success state on successful registration', async () => {
      mockRegister.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should not invalidate queries on registration failure', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Registration failed'));
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            username: 'newuser',
            email: 'newuser@example.com',
            password: 'password123',
          });
        } catch {
          // Expected to throw
        }
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('useLogout', () => {
    it('should call logout from AuthContext', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(mockLogout).toHaveBeenCalled();
    });

    it('should clear query cache on successful logout', async () => {
      mockLogout.mockResolvedValueOnce(undefined);
      const clearSpy = vi.spyOn(queryClient, 'clear');

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(clearSpy).toHaveBeenCalled();
    });

    it('should log error on logout failure', async () => {
      const error = new Error('Logout failed');
      mockLogout.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch {
          // Expected to throw
        }
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Logout error:', error);
    });

    it('should set error state on logout failure', async () => {
      const error = new Error('Logout failed');
      mockLogout.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
    });

    it('should not clear cache on logout failure', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Logout failed'));
      const clearSpy = vi.spyOn(queryClient, 'clear');

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch {
          // Expected to throw
        }
      });

      expect(clearSpy).not.toHaveBeenCalled();
    });

    it('should set success state on successful logout', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useCurrentUser', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roleId: 1,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should fetch current user data', async () => {
      mockAuthApi.getMe.mockResolvedValueOnce(mockUser);

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthApi.getMe).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockUser);
    });

    it('should not retry on failure', async () => {
      mockAuthApi.getMe.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only be called once (no retries)
      expect(mockAuthApi.getMe).toHaveBeenCalledTimes(1);
    });

    it('should return error state on failure', async () => {
      const error = new Error('Unauthorized');
      mockAuthApi.getMe.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });

    it('should be loading initially', () => {
      mockAuthApi.getMe.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should use auth/me query key', async () => {
      mockAuthApi.getMe.mockResolvedValueOnce(mockUser);

      renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(['auth', 'me'])).toEqual(mockUser);
      });
    });

    it('should return cached data on subsequent calls', async () => {
      mockAuthApi.getMe.mockResolvedValueOnce(mockUser);

      // First call
      const { result: result1 } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second call should use cache
      const { result: result2 } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      // Should still be only 1 API call
      expect(mockAuthApi.getMe).toHaveBeenCalledTimes(1);
      expect(result2.current.data).toEqual(mockUser);
    });
  });
});
