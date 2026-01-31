import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../lib/api';
import { Role, UpdateRoleData } from '../types/auth';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

/**
 * Hook to fetch all roles
 */
export function useRoles(enabled = true) {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    enabled,
  });
}

/**
 * Hook to create a new role
 * Uses cache updates for immediate UI feedback
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: rolesApi.create,
    onSuccess: (newRole) => {
      queryClient.setQueryData<Role[]>(['roles'], (old = []) => {
        return [newRole, ...old];
      });
      showToast('Role created successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

/**
 * Hook to update an existing role
 * Uses cache updates for immediate UI feedback
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleData }) =>
      rolesApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Role[]>(['roles'], (old = []) => {
        return old.map((role) => (role.id === updated.id ? updated : role));
      });
      showToast('Role updated successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

/**
 * Hook to delete a role
 * Uses optimistic updates for immediate UI feedback
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Role[]>(['roles'], (old = []) => {
        return old.filter((role) => role.id !== deletedId);
      });
      showToast('Role deleted successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

/**
 * Hook to fetch a single role by ID
 */
export function useRole(id: number) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => rolesApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch all available permissions
 */
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.getPermissions(),
    staleTime: 10 * 60 * 1000, // 10 minutes (permissions rarely change)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to update role permissions
 * Uses cache updates for immediate UI feedback
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      rolesApi.updatePermissions(id, permissionIds),
    onSuccess: (updatedRole) => {
      // Update single-item cache
      queryClient.setQueryData(['roles', updatedRole.id], updatedRole);

      // Update in list cache
      queryClient.setQueryData<Role[]>(['roles'], (old = []) => {
        return old.map((role) => (role.id === updatedRole.id ? updatedRole : role));
      });

      showToast('Role permissions updated successfully', 'success');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to update role permissions';
      showToast(message, 'error');
    },
  });
}
