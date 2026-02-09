import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { LoginCredentials, RegisterData } from '@/types/auth';
import { logger } from '@/lib/logger';

export function useLogin() {
  const { login } = useAuthContext();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onError: (error) => {
      logger.error('Login error:', error);
    },
  });
}

export function useRegister() {
  const { register } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterData) => register(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setupStatus'] });
    },
    onError: (error) => {
      logger.error('Registration error:', error);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear();
    },
    onError: (error) => {
      logger.error('Logout error:', error);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
