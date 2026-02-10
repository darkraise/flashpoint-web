import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFeatureFlags } from '../useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

interface CreateQueryHookOptions<TData, TCreate, TUpdate, TId = number | string> {
  queryKey: string[];
  featureFlag?: keyof ReturnType<typeof useFeatureFlags>;
  api: {
    getAll: () => Promise<TData[]>;
    getById?: (id: TId) => Promise<TData>;
    create: (data: TCreate) => Promise<TData>;
    update: (id: TId, data: TUpdate) => Promise<TData>;
    delete: (id: TId) => Promise<void | unknown>;
  };
  messages?: {
    createSuccess?: string;
    updateSuccess?: string;
    deleteSuccess?: string;
  };
}

interface QueryHookResult<TData, TCreate, TUpdate, TId = number | string> {
  useAllQuery: (enabled?: boolean) => ReturnType<typeof useQuery<TData[]>>;
  useCreateMutation: () => ReturnType<typeof useMutation<TData, unknown, TCreate>>;
  useUpdateMutation: () => ReturnType<
    typeof useMutation<TData, unknown, { id: TId; data: TUpdate }>
  >;
  useDeleteMutation: () => ReturnType<typeof useMutation<unknown, unknown, TId>>;
}

/**
 * Factory function to create a set of hooks for CRUD operations
 *
 * This eliminates code duplication across similar hooks like useRoles, useUsers, etc.
 * Each hook created by this factory provides:
 * - Query hook for fetching all items
 * - Create mutation with optimistic updates
 * - Update mutation with optimistic updates
 * - Delete mutation with optimistic updates
 * - Automatic toast notifications
 * - Feature flag support
 *
 * @example
 * ```typescript
 * const useRolesHook = createQueryHook<Role, CreateRoleData, UpdateRoleData>({
 *   queryKey: ['roles'],
 *   featureFlag: 'enableRoles',
 *   api: rolesApi,
 *   messages: {
 *     createSuccess: 'Role created successfully',
 *     updateSuccess: 'Role updated successfully',
 *     deleteSuccess: 'Role deleted successfully',
 *   },
 * });
 *
 * export const {
 *   useAllQuery: useRoles,
 *   useCreateMutation: useCreateRole,
 *   useUpdateMutation: useUpdateRole,
 *   useDeleteMutation: useDeleteRole,
 * } = useRolesHook();
 * ```
 */
interface Identifiable {
  id: string | number;
}

export function createQueryHook<
  TData extends Identifiable,
  TCreate,
  TUpdate,
  TId = number | string,
>(
  options: CreateQueryHookOptions<TData, TCreate, TUpdate, TId>
): () => QueryHookResult<TData, TCreate, TUpdate, TId> {
  return () => {
    const queryClient = useQueryClient();
    const { showToast } = useDialog();
    const featureFlags = useFeatureFlags();

    const isEnabled = options.featureFlag ? featureFlags[options.featureFlag] : true;

    const useAllQuery = (enabled = true) => {
      return useQuery({
        queryKey: options.queryKey,
        queryFn: options.api.getAll,
        enabled: isEnabled && enabled,
      });
    };

    const useCreateMutation = () => {
      return useMutation({
        mutationFn: options.api.create,
        onSuccess: (newItem) => {
          queryClient.setQueryData<TData[]>(options.queryKey, (old = []) => {
            return [newItem, ...old];
          });
          showToast(options.messages?.createSuccess ?? 'Created successfully', 'success');
        },
        onError: (error: unknown) => {
          showToast(getErrorMessage(error), 'error');
        },
      });
    };

    const useUpdateMutation = () => {
      return useMutation({
        mutationFn: ({ id, data }: { id: TId; data: TUpdate }) => options.api.update(id, data),
        onSuccess: (updated) => {
          queryClient.setQueryData<TData[]>(options.queryKey, (old = []) => {
            return old.map((item) => (item.id === updated.id ? updated : item));
          });
          showToast(options.messages?.updateSuccess ?? 'Updated successfully', 'success');
        },
        onError: (error: unknown) => {
          showToast(getErrorMessage(error), 'error');
        },
      });
    };

    const useDeleteMutation = () => {
      return useMutation({
        mutationFn: options.api.delete,
        onSuccess: (_, deletedId) => {
          queryClient.setQueryData<TData[]>(options.queryKey, (old = []) => {
            return old.filter((item) => item.id !== deletedId);
          });
          showToast(options.messages?.deleteSuccess ?? 'Deleted successfully', 'success');
        },
        onError: (error: unknown) => {
          showToast(getErrorMessage(error), 'error');
        },
      });
    };

    return {
      useAllQuery,
      useCreateMutation,
      useUpdateMutation,
      useDeleteMutation,
    };
  };
}
