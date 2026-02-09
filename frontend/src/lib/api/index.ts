export { apiClient } from './client';

export { authApi } from './auth';

export { gamesApi } from './games';

export { playlistsApi, communityPlaylistsApi } from './playlists';
export type { CommunityPlaylistsResponse } from './playlists';

export { platformsApi } from './platforms';
export { tagsApi } from './tags';

export { usersApi } from './users';
export { rolesApi } from './roles';

export { userPlaylistsApi } from './userPlaylists';
export type { PlaylistWithGames } from './userPlaylists';
export { sharedPlaylistsApi } from './sharedPlaylists';

export { favoritesApi } from './favorites';

export { activitiesApi } from './activities';

export { statisticsApi } from './statistics';

export { playTrackingApi } from './playTracking';

export { domainsApi } from './domains';

export { authSettingsApi, systemSettingsApi } from './settings';

export { jobsApi } from './jobs';

export { ruffleApi } from './ruffle';

export { githubApi } from './github';

export { updatesApi } from './updates';
export type { MetadataUpdateInfo, MetadataSyncStatus } from './updates';

import { apiClient } from './client';
export default apiClient;
