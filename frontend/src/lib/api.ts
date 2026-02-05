import { apiClient as api } from './api/client';
import {
  Game,
  PaginatedResult,
  GameFilters,
  FilterOptions,
  Playlist,
  GameLaunchData,
} from '@/types/game';
import {
  LoginCredentials,
  RegisterData,
  LoginResponse,
  RegisterResponse,
  User,
  AuthTokens,
  UserDetails,
  UsersResponse,
  CreateUserData,
  UpdateUserData,
  ChangePasswordData,
  Role,
  CreateRoleData,
  UpdateRoleData,
  Permission,
  ActivitiesResponse,
  ActivityFilters,
  AuthSettings,
  UpdateAuthSettingsData,
  ActivityStatsResponse,
  ActivityTrendResponse,
  TopActionsResponse,
  ActivityBreakdownResponse,
  TimeRange,
} from '@/types/auth';
import {
  StartSessionResponse,
  EndSessionResponse,
  UserStats,
  GameStats,
  PlaySession,
  PlayActivityData,
  GameDistribution,
} from '@/types/play-tracking';
import {
  UserPlaylist,
  CreatePlaylistData,
  UpdatePlaylistData,
  PlaylistStats,
} from '@/types/playlist';
import {
  Favorite,
  FavoriteGame,
  FavoriteGameIdsResponse,
  FavoritesStats,
  ToggleFavoriteResponse,
  AddFavoriteResponse,
  BatchAddFavoritesResponse,
  BatchRemoveFavoritesResponse,
  ClearAllFavoritesResponse,
} from '@/types/favorite';
import { SystemSettings, PublicSettings } from '@/types/settings';
import { JobStatusEnriched, JobLogsResponse } from '@/types/jobs';

/**
 * Playlist with games array (returned from add/remove operations)
 */
export interface PlaylistWithGames extends UserPlaylist {
  games: Game[];
}

export const gamesApi = {
  search: async (filters: GameFilters, signal?: AbortSignal): Promise<PaginatedResult<Game>> => {
    const { data } = await api.get<PaginatedResult<Game>>('/games', {
      params: filters,
      signal,
    });
    return data;
  },

  getFilterOptions: async (): Promise<FilterOptions> => {
    const { data } = await api.get<FilterOptions>('/games/filter-options');
    return data;
  },

  getById: async (id: string): Promise<Game> => {
    const { data } = await api.get<Game>(`/games/${id}`);
    return data;
  },

  getRelated: async (id: string, limit = 10): Promise<Game[]> => {
    const { data } = await api.get<Game[]>(`/games/${id}/related`, {
      params: { limit },
    });
    return data;
  },

  getRandom: async (library?: string): Promise<Game> => {
    const { data } = await api.get<Game>('/games/random', {
      params: { library },
    });
    return data;
  },

  getLaunchData: async (id: string): Promise<GameLaunchData> => {
    const { data } = await api.get<GameLaunchData>(`/games/${id}/launch`);
    return data;
  },

  downloadGame: async (
    id: string,
    gameDataId?: number
  ): Promise<{ success: boolean; message: string; gameDataId: number; sha256: string }> => {
    const { data } = await api.post(`/games/${id}/download`, { gameDataId });
    return data;
  },

  cancelDownload: async (
    id: string
  ): Promise<{ success: boolean; cancelled: boolean; message: string }> => {
    const { data } = await api.delete(`/games/${id}/download`);
    return data;
  },

  getMostPlayed: async (limit = 20): Promise<PaginatedResult<Game>> => {
    const { data } = await api.get<{ success: boolean; data: Game[]; total: number }>(
      '/games/most-played',
      {
        params: { limit },
      }
    );
    return {
      data: data.data,
      total: data.total,
      page: 1,
      limit,
      totalPages: 1,
    };
  },
};

export const playlistsApi = {
  getAll: async (): Promise<Playlist[]> => {
    const { data } = await api.get<Playlist[]>('/playlists');
    return data;
  },

  getById: async (id: string): Promise<Playlist> => {
    const { data } = await api.get<Playlist>(`/playlists/${id}`);
    return data;
  },

  create: async (playlist: {
    title: string;
    description?: string;
    author?: string;
    library?: string;
  }): Promise<Playlist> => {
    const { data } = await api.post<Playlist>('/playlists', playlist);
    return data;
  },

  addGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await api.post<Playlist>(`/playlists/${playlistId}/games`, { gameIds });
    return data;
  },

  removeGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await api.delete<Playlist>(`/playlists/${playlistId}/games`, {
      data: { gameIds },
    });
    return data;
  },

  delete: async (playlistId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/playlists/${playlistId}`);
    return data;
  },
};

export const platformsApi = {
  getAll: async (): Promise<Array<{ platform: string; count: number }>> => {
    const { data } = await api.get('/platforms');
    return data;
  },
};

export const tagsApi = {
  getAll: async (): Promise<Array<{ name: string; count: number }>> => {
    const { data } = await api.get('/tags');
    return data;
  },
};

export interface CommunityPlaylistsResponse {
  categories: Array<{
    name: string;
    playlists: Array<{
      name: string;
      author: string;
      description: string;
      downloadUrl: string;
      category: string;
      subcategory?: string;
    }>;
  }>;
  lastFetched: string;
}

export const communityPlaylistsApi = {
  fetchAll: async (): Promise<CommunityPlaylistsResponse> => {
    const { data } = await api.get<CommunityPlaylistsResponse>('/community-playlists');
    return data;
  },

  download: async (downloadUrl: string): Promise<Playlist> => {
    const { data } = await api.post<Playlist>('/community-playlists/download', {
      downloadUrl,
    });
    return data;
  },
};

// ===================================
// Authentication API
// ===================================

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    const { data } = await api.post<RegisterResponse>('/auth/register', userData);
    return data;
  },

  logout: async (refreshToken: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post('/auth/logout', { refreshToken });
    return data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  getSetupStatus: async (): Promise<{ needsSetup: boolean; message: string }> => {
    const { data } = await api.get<{ needsSetup: boolean; message: string }>('/auth/setup-status');
    return data;
  },
};

// ===================================
// Users Management API
// ===================================

export const usersApi = {
  getAll: async (page = 1, limit = 50): Promise<UsersResponse> => {
    const { data } = await api.get<UsersResponse>('/users', {
      params: { page, limit },
    });
    return data;
  },

  getById: async (id: number): Promise<UserDetails> => {
    const { data } = await api.get<UserDetails>(`/users/${id}`);
    return data;
  },

  create: async (userData: CreateUserData): Promise<UserDetails> => {
    const { data } = await api.post<UserDetails>('/users', userData);
    return data;
  },

  update: async (id: number, userData: UpdateUserData): Promise<UserDetails> => {
    const { data } = await api.patch<UserDetails>(`/users/${id}`, userData);
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },

  changePassword: async (
    id: number,
    passwordData: ChangePasswordData
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/users/${id}/change-password`, passwordData);
    return data;
  },

  // Legacy theme methods (kept for backward compatibility)
  getTheme: async (): Promise<{ themeColor: string; surfaceColor: string }> => {
    const { data } = await api.get('/users/me/theme');
    return data;
  },

  updateTheme: async (
    themeColor: string,
    surfaceColor: string
  ): Promise<{ success: boolean; themeColor: string; surfaceColor: string }> => {
    const { data } = await api.patch('/users/me/theme', { themeColor, surfaceColor });
    return data;
  },

  // Theme settings methods (uses generic settings endpoint)
  getThemeSettings: async (): Promise<{ mode: string; primaryColor: string }> => {
    const settings = await usersApi.getAllSettings();
    return {
      mode: settings.theme_mode || 'dark',
      primaryColor: settings.primary_color || 'blue',
    };
  },

  updateThemeSettings: async (
    mode: string,
    primaryColor: string
  ): Promise<{ mode: string; primaryColor: string }> => {
    await usersApi.updateSettings({
      theme_mode: mode,
      primary_color: primaryColor,
    });
    return { mode, primaryColor };
  },

  // Generic settings methods for future extensibility
  getAllSettings: async (): Promise<Record<string, string>> => {
    const { data } = await api.get('/users/me/settings');
    return data;
  },

  updateSettings: async (settings: Record<string, string>): Promise<Record<string, string>> => {
    const { data } = await api.patch('/users/me/settings', settings);
    return data;
  },
};

// ===================================
// Roles Management API
// ===================================

export const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    const { data } = await api.get<Role[]>('/roles');
    return data;
  },

  getById: async (id: number): Promise<Role> => {
    const { data } = await api.get<Role>(`/roles/${id}`);
    return data;
  },

  getPermissions: async (): Promise<Permission[]> => {
    const { data } = await api.get<Permission[]>('/roles/permissions');
    return data;
  },

  create: async (roleData: CreateRoleData): Promise<Role> => {
    const { data } = await api.post<Role>('/roles', roleData);
    return data;
  },

  update: async (id: number, roleData: UpdateRoleData): Promise<Role> => {
    const { data } = await api.patch<Role>(`/roles/${id}`, roleData);
    return data;
  },

  updatePermissions: async (id: number, permissionIds: number[]): Promise<Role> => {
    const { data } = await api.put<Role>(`/roles/${id}/permissions`, { permissionIds });
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/roles/${id}`);
    return data;
  },
};

// ===================================
// Activities API
// ===================================

export const activitiesApi = {
  getAll: async (page = 1, limit = 50, filters?: ActivityFilters): Promise<ActivitiesResponse> => {
    const { data } = await api.get<ActivitiesResponse>('/activities', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  getStats: async (
    timeRange: TimeRange = '24h',
    customRange?: { startDate?: string; endDate?: string }
  ): Promise<ActivityStatsResponse> => {
    const { data } = await api.get<ActivityStatsResponse>('/activities/stats', {
      params: { timeRange, ...customRange },
    });
    return data;
  },

  getTrend: async (days = 7): Promise<ActivityTrendResponse> => {
    const { data } = await api.get<ActivityTrendResponse>('/activities/trend', {
      params: { days },
    });
    return data;
  },

  getTopActions: async (limit = 10, timeRange: TimeRange = '24h'): Promise<TopActionsResponse> => {
    const { data } = await api.get<TopActionsResponse>('/activities/top-actions', {
      params: { limit, timeRange },
    });
    return data;
  },

  getBreakdown: async (
    groupBy: 'resource' | 'user' | 'ip',
    limit = 10,
    timeRange: TimeRange = '24h'
  ): Promise<ActivityBreakdownResponse> => {
    const { data } = await api.get<ActivityBreakdownResponse>('/activities/breakdown', {
      params: { groupBy, limit, timeRange },
    });
    return data;
  },
};

// ===================================
// Auth Settings API
// ===================================

export const authSettingsApi = {
  get: async (): Promise<AuthSettings> => {
    const { data } = await api.get<AuthSettings>('/settings/auth');
    return data;
  },

  update: async (settings: UpdateAuthSettingsData): Promise<AuthSettings> => {
    const { data } = await api.patch<AuthSettings>('/settings/auth', settings);
    return data;
  },
};

// ===================================
// System Settings API
// ===================================

export const systemSettingsApi = {
  getAll: async (): Promise<SystemSettings> => {
    const { data } = await api.get<SystemSettings>('/settings');
    return data;
  },

  getPublic: async (): Promise<PublicSettings> => {
    const { data } = await api.get<PublicSettings>('/settings/public');
    return data;
  },

  getCategory: async (category: string): Promise<Record<string, unknown>> => {
    const { data } = await api.get<Record<string, unknown>>(`/settings/${category}`);
    return data;
  },

  updateCategory: async (
    category: string,
    settings: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const { data } = await api.patch<Record<string, unknown>>(`/settings/${category}`, settings);
    return data;
  },

  getSetting: async (category: string, key: string): Promise<{ value: unknown }> => {
    const { data } = await api.get<{ value: unknown }>(`/settings/${category}/${key}`);
    return data;
  },

  updateSetting: async (
    category: string,
    key: string,
    value: unknown
  ): Promise<{ value: unknown }> => {
    const { data } = await api.patch<{ value: unknown }>(`/settings/${category}/${key}`, { value });
    return data;
  },

  getCacheStats: async (): Promise<{
    keyCount: number;
    categoryCount: number;
    hitRate: number;
    size: number;
  }> => {
    const { data } = await api.get('/settings/_cache/stats');
    return data;
  },

  clearCache: async (category?: string): Promise<{ message: string }> => {
    const { data } = await api.post('/settings/_cache/clear', { category });
    return data;
  },
};

// ===================================
// Play Tracking API
// ===================================

export const statisticsApi = {
  getStatistics: async () => {
    const { data } = await api.get('/statistics');
    return data;
  },
};

export const playTrackingApi = {
  startSession: async (gameId: string, gameTitle: string): Promise<StartSessionResponse> => {
    const { data } = await api.post<StartSessionResponse>('/play/start', {
      gameId,
      gameTitle,
    });
    return data;
  },

  endSession: async (sessionId: string): Promise<EndSessionResponse> => {
    const { data } = await api.post<EndSessionResponse>('/play/end', {
      sessionId,
    });
    return data;
  },

  getStats: async (): Promise<UserStats> => {
    const { data } = await api.get<UserStats>('/play/stats');
    return data;
  },

  getGameStats: async (
    limit = 50,
    offset = 0
  ): Promise<{ data: GameStats[]; limit: number; offset: number }> => {
    const { data } = await api.get('/play/game-stats', {
      params: { limit, offset },
    });
    return data;
  },

  getHistory: async (
    limit = 50,
    offset = 0
  ): Promise<{ data: PlaySession[]; limit: number; offset: number }> => {
    const { data } = await api.get('/play/history', {
      params: { limit, offset },
    });
    return data;
  },

  getTopGames: async (limit = 10): Promise<GameStats[]> => {
    const { data } = await api.get<GameStats[]>('/play/top-games', {
      params: { limit },
    });
    return data;
  },

  getActivityOverTime: async (days = 30): Promise<PlayActivityData[]> => {
    const { data } = await api.get<PlayActivityData[]>('/play/activity-over-time', {
      params: { days },
    });
    return data;
  },

  getGamesDistribution: async (limit = 10): Promise<GameDistribution[]> => {
    const { data } = await api.get<GameDistribution[]>('/play/games-distribution', {
      params: { limit },
    });
    return data;
  },
};

// ===================================
// User Playlists API
// ===================================

export const userPlaylistsApi = {
  getAll: async (): Promise<UserPlaylist[]> => {
    const { data } = await api.get<UserPlaylist[]>('/user-playlists');
    return data;
  },

  getStats: async (): Promise<PlaylistStats> => {
    const { data } = await api.get<PlaylistStats>('/user-playlists/stats');
    return data;
  },

  getById: async (id: number): Promise<UserPlaylist> => {
    const { data } = await api.get<UserPlaylist>(`/user-playlists/${id}`);
    return data;
  },

  getGames: async (id: number): Promise<Game[]> => {
    const { data } = await api.get<Game[]>(`/user-playlists/${id}/games`);
    return data;
  },

  create: async (playlistData: CreatePlaylistData): Promise<UserPlaylist> => {
    const { data } = await api.post<UserPlaylist>('/user-playlists', playlistData);
    return data;
  },

  update: async (id: number, playlistData: UpdatePlaylistData): Promise<UserPlaylist> => {
    const { data } = await api.patch<UserPlaylist>(`/user-playlists/${id}`, playlistData);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/user-playlists/${id}`);
  },

  addGames: async (id: number, gameIds: string[]): Promise<PlaylistWithGames> => {
    const { data } = await api.post<PlaylistWithGames>(`/user-playlists/${id}/games`, { gameIds });
    return data;
  },

  removeGames: async (id: number, gameIds: string[]): Promise<PlaylistWithGames> => {
    const { data } = await api.delete<PlaylistWithGames>(`/user-playlists/${id}/games`, {
      data: { gameIds },
    });
    return data;
  },

  reorderGames: async (id: number, gameIdOrder: string[]): Promise<void> => {
    await api.put(`/user-playlists/${id}/games/reorder`, { gameIdOrder });
  },

  copyFlashpointPlaylist: async (
    flashpointPlaylistId: string,
    newTitle?: string
  ): Promise<UserPlaylist> => {
    const { data } = await api.post<UserPlaylist>('/user-playlists/copy-flashpoint', {
      flashpointPlaylistId,
      newTitle,
    });
    return data;
  },
};

// ===================================
// Favorites API
// ===================================

export const favoritesApi = {
  getAll: async (limit?: number, offset?: number): Promise<Favorite[]> => {
    const { data } = await api.get<Favorite[]>('/favorites', {
      params: { limit, offset },
    });
    return data;
  },

  getGameIds: async (): Promise<string[]> => {
    const { data } = await api.get<FavoriteGameIdsResponse>('/favorites/game-ids');
    return data.gameIds;
  },

  getGames: async (
    limit?: number,
    offset?: number,
    sortBy?: 'title' | 'dateAdded',
    sortOrder?: 'asc' | 'desc'
  ): Promise<FavoriteGame[]> => {
    const { data } = await api.get<FavoriteGame[]>('/favorites/games', {
      params: { limit, offset, sortBy, sortOrder },
    });
    return data;
  },

  getStats: async (): Promise<FavoritesStats> => {
    const { data } = await api.get<FavoritesStats>('/favorites/stats');
    return data;
  },

  toggle: async (gameId: string): Promise<boolean> => {
    const { data } = await api.post<ToggleFavoriteResponse>('/favorites/toggle', { gameId });
    return data.isFavorited;
  },

  add: async (gameId: string): Promise<boolean> => {
    const { data } = await api.post<AddFavoriteResponse>('/favorites', { gameId });
    return data.success;
  },

  remove: async (gameId: string): Promise<void> => {
    await api.delete(`/favorites/${gameId}`);
  },

  batchAdd: async (gameIds: string[]): Promise<number> => {
    const { data } = await api.post<BatchAddFavoritesResponse>('/favorites/batch', { gameIds });
    return data.added;
  },

  batchRemove: async (gameIds: string[]): Promise<number> => {
    const { data } = await api.delete<BatchRemoveFavoritesResponse>('/favorites/batch', {
      data: { gameIds },
    });
    return data.removed;
  },

  clearAll: async (): Promise<number> => {
    const { data } = await api.delete<ClearAllFavoritesResponse>('/favorites');
    return data.removed;
  },
};

// ===================================
// Jobs API
// ===================================

export const jobsApi = {
  getAll: async (): Promise<JobStatusEnriched[]> => {
    const { data } = await api.get<JobStatusEnriched[]>('/jobs');
    return data;
  },

  getById: async (jobId: string): Promise<JobStatusEnriched> => {
    const { data } = await api.get<JobStatusEnriched>(`/jobs/${jobId}`);
    return data;
  },

  update: async (jobId: string, updates: { enabled: boolean }): Promise<JobStatusEnriched> => {
    const { data } = await api.patch<JobStatusEnriched>(`/jobs/${jobId}`, updates);
    return data;
  },

  start: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/jobs/${jobId}/start`);
    return data;
  },

  stop: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/jobs/${jobId}/stop`);
    return data;
  },

  trigger: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/jobs/${jobId}/trigger`);
    return data;
  },

  getLogs: async (jobId: string, limit = 50, offset = 0): Promise<JobLogsResponse> => {
    const { data } = await api.get<JobLogsResponse>(`/jobs/${jobId}/logs`, {
      params: { limit, offset },
    });
    return data;
  },

  getAllLogs: async (limit = 100, offset = 0): Promise<JobLogsResponse> => {
    const { data } = await api.get<JobLogsResponse>('/jobs/logs/all', {
      params: { limit, offset },
    });
    return data;
  },
};

// ===================================
// Ruffle Management API
// ===================================

export const ruffleApi = {
  getVersion: async (): Promise<{ currentVersion: string | null; isInstalled: boolean }> => {
    const { data } = await api.get('/ruffle/version');
    return data;
  },

  checkUpdate: async (): Promise<{
    currentVersion: string | null;
    latestVersion: string;
    updateAvailable: boolean;
    changelog?: string;
    publishedAt?: string;
  }> => {
    const { data } = await api.get('/ruffle/check-update');
    return data;
  },

  update: async (): Promise<{
    success: boolean;
    version: string;
    message: string;
  }> => {
    const { data } = await api.post('/ruffle/update');
    return data;
  },
};

// ===================================
// GitHub API
// ===================================
export const githubApi = {
  getStarCount: async (): Promise<{ stars: number }> => {
    const { data } = await api.get<{ success: boolean; data: { stars: number } }>('/github/stars');
    return data.data;
  },
};

// ===================================
// Updates/Metadata API
// ===================================

export interface MetadataSyncStatus {
  isRunning: boolean;
  stage: string;
  progress: number;
  message: string;
  error?: string;
  result?: {
    gamesUpdated: number;
    gamesDeleted: number;
    tagsUpdated: number;
    platformsUpdated: number;
  };
}

export const updatesApi = {
  /**
   * Start metadata sync in background
   * Returns immediately with sync started status
   */
  startMetadataSync: async (): Promise<{
    success: boolean;
    message: string;
    status: MetadataSyncStatus;
  }> => {
    const { data } = await api.post('/updates/metadata/sync');
    return data;
  },

  /**
   * Get current metadata sync status
   * Used for polling during sync process
   */
  getMetadataSyncStatus: async (): Promise<MetadataSyncStatus> => {
    const { data } = await api.get<MetadataSyncStatus>('/updates/metadata/sync/status');
    return data;
  },
};

export default api;
