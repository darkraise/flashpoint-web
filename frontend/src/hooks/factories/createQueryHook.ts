import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFeatureFlags } from '../useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

/**
 * Options for creating a query hook with CRUD operations
 */
interface CreateQueryHookOptions<TData, TCreate, TUpdate, TId = number | string> {
  /** Query key for TanStack Query cache */
  queryKey: string[];

  /** Optional feature flag to check before enabling queries */
  featureFlag?: keyof ReturnType<typeof useFeatureFlags>;

  /** API methods for CRUD operations */
  api: {
    /** Get all items */
    getAll: () => Promise<TData[]>;

    /** Get single item by ID (optional) */
    getById?: (id: TId) => Promise<TData>;

    /** Create new item */
    create: (data: TCreate) => Promise<TData>;

    /** Update existing item */
    update: (id: TId, data: TUpdate) => Promise<TData>;

    /** Delete item */
    delete: (id: TId) => Promise<void | any>;
  };

  /** Optional success messages for mutations */
  messages?: {
    createSuccess?: string;
    updateSuccess?: string;
    deleteSuccess?: string;
  };
}

/**
 * Return type for the created query hook
 */
interface QueryHookResult<TData, TCreate, TUpdate, TId = number | string> {
  /** Hook to query all items */
  useAllQuery: (enabled?: boolean) => ReturnType<typeof useQuery<TData[]>>;

  /** Hook to create a new item */
  useCreateMutation: () => ReturnType<typeof useMutation<TData, unknown, TCreate>>;

  /** Hook to update an existing item */
  useUpdateMutation: () => ReturnType<
    typeof useMutation<TData, unknown, { id: TId; data: TUpdate }>
  >;

  /** Hook to delete an item */
  useDeleteMutation: () => ReturnType<typeof useMutation<void, unknown, TId>>;
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
export function createQueryHook<TData, TCreate, TUpdate, TId = number | string>(
  options: CreateQueryHookOptions<TData, TCreate, TUpdate, TId>
): () => QueryHookResult<TData, TCreate, TUpdate, TId> {
  return () => {
    const queryClient = useQueryClient();
    const { showToast } = useDialog();
    const featureFlags = useFeatureFlags();

    // Check feature flag if provided
    const isEnabled = options.featureFlag ? featureFlags[options.featureFlag] : true;

    // Query hook for fetching all items
    const useAllQuery = (enabled = true) => {
      return useQuery({
        queryKey: options.queryKey,
        queryFn: options.api.getAll,
        enabled: isEnabled && enabled,
      });
    };

    // Create mutation with optimistic update
    const useCreateMutation = () => {
      return useMutation({
        mutationFn: options.api.create,
        onSuccess: (newItem) => {
          // Optimistically update cache by prepending new item
          queryClient.setQueryData<TData[]>(options.queryKey, (old = []) => {
            return [newItem, ...old];
          });
          showToast(
            options.messages?.createSuccess || 'Created successfully',
            'success'
          );
        },
        onError: (error: unknown) => {
          showToast(getErrorMessage(error), 'error');
        },
      });
    };

    // Update mutation with optimistic update
    const useUpdateMutation = () => {
      return useMutation({
        mutationFn: ({ id, data }: { id: TId; data: TUpdate }) =>
          options.api.update(id, data),
        onSuccess: (updated) => {
          // Optimistically update cache by replacing the updated item
          queryClient.setQueryData<TData[]>(options.queryKey, (old = []) => {
            return old.map((item) =>
              (item as any).id === (updated as any).id ? updated : item
            );
          });
          showToast(
            options.messages?.updateSuccess || 'Updated successfully',
            'success'
          );
        },
        onError: (error: unknown) => {
          showToast(getErrorMessage(error), 'error');
        },
      });
    };

    // Delete mutation with optimistic update
    const useDeleteMutation = () => {
      return useMutation({
        mutationFn: options.api.delete,
        onSuccess: (_, deletedId) => {
          // Optimistically update cache by removing the deleted item
          queryClient.setQueryData<TData[]>(options.queryKey, (old = []) => {
            return old.filter((item) => (item as any).id !== deletedId);
          });
          showToast(
            options.messages?.deleteSuccess || 'Deleted successfully',
            'success'
          );
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
