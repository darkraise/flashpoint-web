import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityPlaylistsApi } from '@/lib/api';

export interface CommunityPlaylist {
  name: string;
  author: string;
  description: string;
  downloadUrl: string;
  category: string;
  subcategory?: string;
}

export interface CommunityPlaylistCategory {
  name: string;
  playlists: CommunityPlaylist[];
}

export interface CommunityPlaylistsResponse {
  categories: CommunityPlaylistCategory[];
  lastFetched: string;
}

export function useCommunityPlaylists() {
  return useQuery({
    queryKey: ['community-playlists'],
    queryFn: () => communityPlaylistsApi.fetchAll(),
    staleTime: 5 * 60 * 1000,
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
