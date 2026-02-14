import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/lib/api';
import { UpdateRoleData } from '@/types/auth';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

export function useRoles(page: number = 1, limit: number = 20, enabled = true) {
  return useQuery({
    queryKey: ['roles', { page, limit }],
    queryFn: () => rolesApi.getAll(page, limit),
    enabled,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
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
      queryClient.invalidateQueries({ queryKey: ['roles'] });

      showToast('Role permissions updated successfully', 'success');
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to update role permissions';
      showToast(message, 'error');
    },
  });
}
