import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../lib/api';
import { CreateUserData, UpdateUserData, ChangePasswordData } from '../types/auth';
import { useDialog } from '@/contexts/DialogContext';

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
 * Uses cache updates for immediate UI feedback
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (userData: CreateUserData) => usersApi.create(userData),
    onSuccess: (newUser) => {
      // Add to single-item cache
      queryClient.setQueryData(['users', newUser.id], newUser);

      // Invalidate paginated lists (safer for paginated data)
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });

      showToast('User created successfully', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to create user';
      showToast(message, 'error');
    }
  });
}

/**
 * Hook to update an existing user
 * Uses cache updates for immediate UI feedback
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: UpdateUserData }) =>
      usersApi.update(id, userData),
    onSuccess: (updatedUser) => {
      // Update single-item cache
      queryClient.setQueryData(['users', updatedUser.id], updatedUser);

      // Invalidate paginated lists (safer for paginated data)
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });

      showToast('User updated successfully', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to update user';
      showToast(message, 'error');
    }
  });
}

/**
 * Hook to delete a user
 * Uses optimistic updates for immediate UI feedback
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),

    onMutate: async (_id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });

      // Store snapshot for rollback (paginated queries)
      const previousQueries = queryClient.getQueriesData({ queryKey: ['users'] });

      return { previousQueries };
    },

    onError: (err: any, _id, context) => {
      if (context?.previousQueries) {
        // Restore all user queries
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const message = err?.response?.data?.error?.message || 'Failed to delete user';
      showToast(message, 'error');
    },

    onSuccess: (_, id) => {
      // Remove single-item cache
      queryClient.removeQueries({ queryKey: ['users', id] });

      // Invalidate paginated lists to refetch
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });

      showToast('User deleted successfully', 'success');
    }
  });
}

/**
 * Hook to change user password
 * Uses toast notifications for feedback
 */
export function useChangePassword() {
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, passwordData }: { id: number; passwordData: ChangePasswordData }) =>
      usersApi.changePassword(id, passwordData),
    onSuccess: () => {
      showToast('Password changed successfully', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to change password';
      showToast(message, 'error');
    }
  });
}
