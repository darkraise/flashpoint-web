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

/**
 * Fetch list of community playlists from the Flashpoint Archive wiki
 */
export function useCommunityPlaylists() {
  return useQuery({
    queryKey: ['community-playlists'],
    queryFn: () => communityPlaylistsApi.fetchAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes (wiki doesn't update frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });
}

/**
 * Download a community playlist and save it locally
 */
export function useDownloadCommunityPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (downloadUrl: string) =>
      communityPlaylistsApi.download(downloadUrl),
    onSuccess: () => {
      // Invalidate playlists cache so the new playlist appears immediately
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    }
  });
}
