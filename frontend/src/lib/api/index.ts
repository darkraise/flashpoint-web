/**
 * Flashpoint Web API Client
 *
 * Centralized barrel export for all API modules.
 * Maintains backward compatibility with the original api.ts structure.
 *
 * Usage:
 * ```typescript
 * import { gamesApi, authApi, userPlaylistsApi } from '@/lib/api';
 * ```
 */

// Re-export API client for custom requests
export { apiClient } from './client';

// Authentication
export { authApi } from './auth';

// Games
export { gamesApi } from './games';

// Playlists
export { playlistsApi, communityPlaylistsApi } from './playlists';
export type { CommunityPlaylistsResponse } from './playlists';

// Platforms & Tags
export { platformsApi } from './platforms';
export { tagsApi } from './tags';

// Users & Roles
export { usersApi } from './users';
export { rolesApi } from './roles';

// User Playlists
export { userPlaylistsApi } from './userPlaylists';

// Favorites
export { favoritesApi } from './favorites';

// Activities
export { activitiesApi } from './activities';

// Statistics
export { statisticsApi } from './statistics';

// Play Tracking
export { playTrackingApi } from './playTracking';

// Settings
export { authSettingsApi, systemSettingsApi } from './settings';

// Jobs
export { jobsApi } from './jobs';

// Ruffle
export { ruffleApi } from './ruffle';

// Default export for legacy compatibility
import { apiClient } from './client';
export default apiClient;
