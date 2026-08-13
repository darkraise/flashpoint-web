export interface CommunityPlaylist {
  name: string;
  author: string;
  description: string;
  downloadUrl: string;
  category: string;
}

export interface CommunityPlaylistCategory {
  name: string;
  playlists: readonly CommunityPlaylist[];
}

export interface CommunityPlaylistsResponse {
  categories: readonly CommunityPlaylistCategory[];
  /** Date the bundled wiki snapshot was captured, as YYYY-MM-DD. */
  lastUpdated: string;
}
