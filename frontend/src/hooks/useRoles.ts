import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/lib/api';
import { Role, UpdateRoleData } from '@/types/auth';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    enabled,
  });
}

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

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleData }) => rolesApi.update(id, data),
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

export function useRole(id: number) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => rolesApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.getPermissions(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      rolesApi.updatePermissions(id, permissionIds),
    onSuccess: (updatedRole) => {
      queryClient.setQueryData(['roles', updatedRole.id], updatedRole);
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
