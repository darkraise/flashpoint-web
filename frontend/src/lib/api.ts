import axios from 'axios';
import { Game, PaginatedResult, GameFilters, Playlist, GameLaunchData } from '@/types/game';
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
  UpdateAuthSettingsData
} from '@/types/auth';
import {
  StartSessionResponse,
  EndSessionResponse,
  UserStats,
  GameStats,
  PlaySession,
  PlayActivityData,
  GameDistribution
} from '@/types/play-tracking';
import { useAuthStore } from '@/store/auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const gamesApi = {
  search: async (filters: GameFilters): Promise<PaginatedResult<Game>> => {
    const { data } = await api.get<PaginatedResult<Game>>('/games', { params: filters });
    return data;
  },

  getById: async (id: string): Promise<Game> => {
    const { data } = await api.get<Game>(`/games/${id}`);
    return data;
  },

  getRelated: async (id: string, limit = 10): Promise<Game[]> => {
    const { data } = await api.get<Game[]>(`/games/${id}/related`, {
      params: { limit }
    });
    return data;
  },

  getRandom: async (library?: string): Promise<Game> => {
    const { data } = await api.get<Game>('/games/random', {
      params: { library }
    });
    return data;
  },

  getLaunchData: async (id: string): Promise<GameLaunchData> => {
    const { data } = await api.get<GameLaunchData>(`/games/${id}/launch`);
    return data;
  },

  downloadGame: async (id: string, gameDataId?: number): Promise<{ success: boolean; message: string; gameDataId: number; sha256: string }> => {
    const { data } = await api.post(`/games/${id}/download`, { gameDataId });
    return data;
  },

  cancelDownload: async (id: string): Promise<{ success: boolean; cancelled: boolean; message: string }> => {
    const { data } = await api.delete(`/games/${id}/download`);
    return data;
  }
};

export const playlistsApi = {
  getAll: async (): Promise<Playlist[]> => {
    const { data } = await api.get<Playlist[]>('/playlists');
    return data;
  },

  getById: async (id: string): Promise<Playlist> => {
    const { data} = await api.get<Playlist>(`/playlists/${id}`);
    return data;
  },

  create: async (playlist: { title: string; description?: string; author?: string; library?: string }): Promise<Playlist> => {
    const { data } = await api.post<Playlist>('/playlists', playlist);
    return data;
  },

  addGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await api.post<Playlist>(`/playlists/${playlistId}/games`, { gameIds });
    return data;
  },

  removeGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await api.delete<Playlist>(`/playlists/${playlistId}/games`, { data: { gameIds } });
    return data;
  },

  delete: async (playlistId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/playlists/${playlistId}`);
    return data;
  }
};

export const platformsApi = {
  getAll: async (): Promise<Array<{ platform: string; count: number }>> => {
    const { data } = await api.get('/platforms');
    return data;
  }
};

export const tagsApi = {
  getAll: async (): Promise<Array<{ name: string; count: number }>> => {
    const { data } = await api.get('/tags');
    return data;
  }
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
      downloadUrl
    });
    return data;
  }
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
  }
};

// ===================================
// Users Management API
// ===================================

export const usersApi = {
  getAll: async (page = 1, limit = 50): Promise<UsersResponse> => {
    const { data } = await api.get<UsersResponse>('/users', {
      params: { page, limit }
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

  changePassword: async (id: number, passwordData: ChangePasswordData): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/users/${id}/change-password`, passwordData);
    return data;
  },

  getTheme: async (): Promise<{ themeColor: string; surfaceColor: string }> => {
    const { data } = await api.get('/users/me/theme');
    return data;
  },

  updateTheme: async (themeColor: string, surfaceColor: string): Promise<{ success: boolean; themeColor: string; surfaceColor: string }> => {
    const { data } = await api.patch('/users/me/theme', { themeColor, surfaceColor });
    return data;
  }
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
  }
};

// ===================================
// Activities API
// ===================================

export const activitiesApi = {
  getAll: async (page = 1, limit = 50, filters?: ActivityFilters): Promise<ActivitiesResponse> => {
    const { data } = await api.get<ActivitiesResponse>('/activities', {
      params: { page, limit, ...filters }
    });
    return data;
  }
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
  }
};

// ===================================
// Play Tracking API
// ===================================

export const playTrackingApi = {
  startSession: async (gameId: string, gameTitle: string): Promise<StartSessionResponse> => {
    const { data } = await api.post<StartSessionResponse>('/play/start', {
      gameId,
      gameTitle
    });
    return data;
  },

  endSession: async (sessionId: string): Promise<EndSessionResponse> => {
    const { data } = await api.post<EndSessionResponse>('/play/end', {
      sessionId
    });
    return data;
  },

  getStats: async (): Promise<UserStats> => {
    const { data } = await api.get<UserStats>('/play/stats');
    return data;
  },

  getGameStats: async (limit = 50, offset = 0): Promise<{ data: GameStats[]; limit: number; offset: number }> => {
    const { data } = await api.get('/play/game-stats', {
      params: { limit, offset }
    });
    return data;
  },

  getHistory: async (limit = 50, offset = 0): Promise<{ data: PlaySession[]; limit: number; offset: number }> => {
    const { data } = await api.get('/play/history', {
      params: { limit, offset }
    });
    return data;
  },

  getTopGames: async (limit = 10): Promise<GameStats[]> => {
    const { data } = await api.get<GameStats[]>('/play/top-games', {
      params: { limit }
    });
    return data;
  },

  getActivityOverTime: async (days = 30): Promise<PlayActivityData[]> => {
    const { data } = await api.get<PlayActivityData[]>('/play/activity-over-time', {
      params: { days }
    });
    return data;
  },

  getGamesDistribution: async (limit = 10): Promise<GameDistribution[]> => {
    const { data } = await api.get<GameDistribution[]>('/play/games-distribution', {
      params: { limit }
    });
    return data;
  }
};

// ===================================
// Axios Interceptors
// ===================================

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          // No refresh token available, clear auth and redirect to login
          useAuthStore.getState().clearAuth();
          return Promise.reject(error);
        }

        // Try to refresh the token
        const tokens = await authApi.refreshToken(refreshToken);

        // Update the access token in the store
        useAuthStore.getState().updateAccessToken(tokens.accessToken);

        // Update the authorization header and retry the original request
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
