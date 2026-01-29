import type { PlaylistIconName } from '@/lib/playlistIcons';

/**
 * User Playlist Types
 */

export interface UserPlaylist {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  icon: PlaylistIconName | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  gameCount: number;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  showOwner?: boolean;
}

export interface PlaylistGame {
  id: number;
  playlistId: number;
  gameId: string;
  orderIndex: number;
  notes: string | null;
  addedAt: string;
}

export interface CreatePlaylistData {
  title: string;
  description?: string;
  icon?: PlaylistIconName | null;
}

export interface UpdatePlaylistData {
  title?: string;
  description?: string;
  icon?: PlaylistIconName | null;
}

export interface PlaylistStats {
  totalPlaylists: number;
  totalGames: number;
}

export interface CopyFlashpointPlaylistData {
  flashpointPlaylistId: string;
  newTitle?: string;
}

export interface AddGamesToPlaylistData {
  gameIds: string[];
}

export interface RemoveGamesFromPlaylistData {
  gameIds: string[];
}

export interface ReorderGamesData {
  gameIdOrder: string[];
}

/**
 * Shared Playlist Types (anonymous access)
 */

export interface SharedPlaylist {
  id: number;
  title: string;
  description: string | null;
  icon: PlaylistIconName | null;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
  ownerUsername?: string; // Conditionally included if showOwner=true
}

export interface ShareLinkData {
  shareToken: string;
  shareUrl: string;
  expiresAt: string | null;
  showOwner: boolean;
}

export interface EnableSharingOptions {
  expiresAt?: string | null;
  showOwner?: boolean;
}
