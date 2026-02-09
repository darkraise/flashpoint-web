import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { CreateUserData, UpdateUserData, ChangePasswordData } from '@/types/auth';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

export function useUsers(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => usersApi.getAll(page, limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (userData: CreateUserData) => usersApi.create(userData),
    onSuccess: (newUser) => {
      queryClient.setQueryData(['users', newUser.id], newUser);
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });

      showToast('User created successfully', 'success');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to create user';
      showToast(message, 'error');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: UpdateUserData }) =>
      usersApi.update(id, userData),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['users', updatedUser.id], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });

      showToast('User updated successfully', 'success');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to update user';
      showToast(message, 'error');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),

    onMutate: async (_id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['users'] });

      return { previousQueries };
    },

    onError: (err: unknown, _id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const message = getErrorMessage(err) || 'Failed to delete user';
      showToast(message, 'error');
    },

    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'], exact: false });

      showToast('User deleted successfully', 'success');
    },
  });
}

export function useChangePassword() {
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, passwordData }: { id: number; passwordData: ChangePasswordData }) =>
      usersApi.changePassword(id, passwordData),
    onSuccess: () => {
      showToast('Password changed successfully', 'success');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to change password';
      showToast(message, 'error');
    },
  });
}
