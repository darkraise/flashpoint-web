import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../lib/api';
import { CreateRoleData, UpdateRoleData } from '../types/auth';

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
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleData: CreateRoleData) => rolesApi.create(roleData),
    onSuccess: () => {
      // Invalidate roles list to refetch
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      console.error('Create role error:', error);
    }
  });
}

/**
 * Hook to update an existing role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roleData }: { id: number; roleData: UpdateRoleData }) =>
      rolesApi.update(id, roleData),
    onSuccess: (data) => {
      // Invalidate roles list and specific role query
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.setQueryData(['roles', data.id], data);
    },
    onError: (error) => {
      console.error('Update role error:', error);
    }
  });
}

/**
 * Hook to update role permissions
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      rolesApi.updatePermissions(id, permissionIds),
    onSuccess: (data) => {
      // Invalidate roles list and specific role query
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.setQueryData(['roles', data.id], data);
    },
    onError: (error) => {
      console.error('Update role permissions error:', error);
    }
  });
}

/**
 * Hook to delete a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => rolesApi.delete(id),
    onSuccess: () => {
      // Invalidate roles list to refetch
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      console.error('Delete role error:', error);
    }
  });
}
