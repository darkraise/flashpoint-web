import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../lib/api';
import { CreateUserData, UpdateUserData, ChangePasswordData } from '../types/auth';

/**
 * Hook to fetch all users with pagination
 */
export function useUsers(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => usersApi.getAll(page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserData) => usersApi.create(userData),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Create user error:', error);
    }
  });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: UpdateUserData }) =>
      usersApi.update(id, userData),
    onSuccess: (data) => {
      // Invalidate users list and specific user query
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.setQueryData(['users', data.id], data);
    },
    onError: (error) => {
      console.error('Update user error:', error);
    }
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Delete user error:', error);
    }
  });
}

/**
 * Hook to change user password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, passwordData }: { id: number; passwordData: ChangePasswordData }) =>
      usersApi.changePassword(id, passwordData),
    onError: (error) => {
      console.error('Change password error:', error);
    }
  });
}
