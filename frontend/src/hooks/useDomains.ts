import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainsApi } from '@/lib/api/domains';
import type { Domain } from '@/types/settings';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

const DOMAINS_QUERY_KEY = ['domains'];

/**
 * Hook to fetch all configured domains (admin only)
 */
export function useDomains(enabled = true) {
  return useQuery({
    queryKey: DOMAINS_QUERY_KEY,
    queryFn: domainsApi.getAll,
    enabled,
  });
}

/**
 * Hook to add a domain
 */
export function useAddDomain() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (hostname: string) => domainsApi.add(hostname),
    onSuccess: (newDomain) => {
      queryClient.setQueryData<Domain[]>(DOMAINS_QUERY_KEY, (old = []) => [...old, newDomain]);
      // Invalidate public settings so default domain updates
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'public'] });
      showToast('Domain added', 'success');
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err) || 'Failed to add domain', 'error');
    },
  });
}

/**
 * Hook to delete a domain
 */
export function useDeleteDomain() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (id: number) => domainsApi.delete(id),
    onSuccess: () => {
      // Refetch instead of optimistic update — the backend may have auto-promoted a new default
      queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'public'] });
      showToast('Domain deleted', 'success');
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err) || 'Failed to delete domain', 'error');
    },
  });
}

/**
 * Hook to set a domain as default
 */
export function useSetDefaultDomain() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (id: number) => domainsApi.setDefault(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: DOMAINS_QUERY_KEY });
      const previous = queryClient.getQueryData<Domain[]>(DOMAINS_QUERY_KEY);

      // Optimistic update: set the new default
      queryClient.setQueryData<Domain[]>(DOMAINS_QUERY_KEY, (old = []) =>
        old.map((d) => ({ ...d, isDefault: d.id === id }))
      );

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'public'] });
      showToast('Default domain updated', 'success');
    },
    onError: (err: unknown, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DOMAINS_QUERY_KEY, context.previous);
      }
      showToast(getErrorMessage(err) || 'Failed to set default domain', 'error');
    },
  });
}

/**
 * Build a share URL from a hostname and share token.
 * Falls back to window.location.origin if no hostname is provided.
 */
export function buildShareUrl(hostname: string | null | undefined, shareToken: string): string {
  const fallback = `${window.location.origin}/playlists/shared/${shareToken}`;

  if (!hostname) {
    return fallback;
  }

  try {
    const protocol = window.location.protocol;
    const url = new URL(`${protocol}//${hostname}/playlists/shared/${shareToken}`);

    // Only allow http/https to prevent javascript: or other protocol injection
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return fallback;
    }

    return url.toString();
  } catch {
    // Invalid hostname — fall back to current origin
    return fallback;
  }
}
