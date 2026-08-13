import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityPlaylistsApi } from '@/lib/api';

export interface CommunityPlaylist {
  name: string;
  author: string;
  description: string;
  downloadUrl: string;
  category: string;
}

/** The list is bundled with the server, so it only needs fetching once per session. */
export function useCommunityPlaylists(enabled: boolean = true) {
  return useQuery({
    queryKey: ['community-playlists'],
    queryFn: () => communityPlaylistsApi.fetchAll(),
    enabled,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
}

export function useDownloadCommunityPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (downloadUrl: string) => communityPlaylistsApi.download(downloadUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
}
