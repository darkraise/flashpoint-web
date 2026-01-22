import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../lib/api';
import { CreateRoleData, UpdateRoleData } from '../types/auth';
import { useDialog } from '@/contexts/DialogContext';

/**
 * Hook to fetch all roles
 */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
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
    gcTime: 10 * 60 * 1000
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
    gcTime: 30 * 60 * 1000 // 30 minutes
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
    mutationFn: (roleData: CreateRoleData) => rolesApi.create(roleData),
    onSuccess: (newRole) => {
      // Add to single-item cache
      queryClient.setQueryData(['roles', newRole.id], newRole);

      // Add to list cache
      queryClient.setQueryData<any[]>(['roles'], (old = []) => {
        return [newRole, ...old];
      });

      showToast('Role created successfully', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to create role';
      showToast(message, 'error');
    }
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
    mutationFn: ({ id, roleData }: { id: number; roleData: UpdateRoleData }) =>
      rolesApi.update(id, roleData),
    onSuccess: (updatedRole) => {
      // Update single-item cache
      queryClient.setQueryData(['roles', updatedRole.id], updatedRole);

      // Update in list cache
      queryClient.setQueryData<any[]>(['roles'], (old = []) => {
        return old.map(role => role.id === updatedRole.id ? updatedRole : role);
      });

      showToast('Role updated successfully', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to update role';
      showToast(message, 'error');
    }
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
      queryClient.setQueryData<any[]>(['roles'], (old = []) => {
        return old.map(role => role.id === updatedRole.id ? updatedRole : role);
      });

      showToast('Role permissions updated successfully', 'success');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to update role permissions';
      showToast(message, 'error');
    }
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
    mutationFn: (id: number) => rolesApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['roles'] });
      const previousRoles = queryClient.getQueryData<any[]>(['roles']);

      // Remove from cache
      queryClient.setQueryData<any[]>(['roles'], (old = []) => {
        return old.filter(role => role.id !== id);
      });

      return { previousRoles };
    },

    onError: (err: any, id, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(['roles'], context.previousRoles);
      }
      const message = err?.response?.data?.error?.message || 'Failed to delete role';
      showToast(message, 'error');
    },

    onSuccess: (_, id) => {
      // Remove single-item cache
      queryClient.removeQueries({ queryKey: ['roles', id] });
      showToast('Role deleted successfully', 'success');
    }
  });
}
