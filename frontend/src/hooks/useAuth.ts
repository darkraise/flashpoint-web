import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { LoginCredentials, RegisterData } from '../types/auth';
import { logger } from '../lib/logger';

/**
 * Hook for login mutation
 */
export function useLogin() {
  const { login } = useAuthContext();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onError: (error) => {
      logger.error('Login error:', error);
    }
  });
}

/**
 * Hook for register mutation
 */
export function useRegister() {
  const { register } = useAuthContext();

  return useMutation({
    mutationFn: (userData: RegisterData) => register(userData),
    onError: (error) => {
      logger.error('Registration error:', error);
    }
  });
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const { logout } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
    onError: (error) => {
      logger.error('Logout error:', error);
    }
  });
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
  });
}
