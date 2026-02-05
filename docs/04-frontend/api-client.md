# API Client

Complete documentation of the Axios-based API client and all available
endpoints.

## Overview

The API client is a centralized Axios instance with request/response
interceptors for authentication and error handling.

**Location:** `frontend/src/lib/api.ts`

## Client Configuration

```typescript
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## Interceptors

### Request Interceptor

Automatically adds JWT token to all requests:

```typescript
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Response Interceptor

Handles 401 errors and automatic token refresh:

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const tokens = await authApi.refreshToken(refreshToken);

        useAuthStore.getState().updateAccessToken(tokens.accessToken);
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## API Modules

### gamesApi

```typescript
gamesApi.search(filters: GameFilters): Promise<PaginatedResult<Game>>
gamesApi.getFilterOptions(): Promise<FilterOptions>
gamesApi.getById(id: string): Promise<Game>
gamesApi.getRelated(id: string, limit?: number): Promise<Game[]>
gamesApi.getRandom(library?: string): Promise<Game>
gamesApi.getLaunchData(id: string): Promise<GameLaunchData>
gamesApi.downloadGame(id: string, gameDataId?: number)
gamesApi.cancelDownload(id: string)
```

### authApi

```typescript
authApi.login(credentials: LoginCredentials): Promise<LoginResponse>
authApi.register(userData: RegisterData): Promise<RegisterResponse>
authApi.logout(refreshToken: string): Promise<void>
authApi.refreshToken(refreshToken: string): Promise<AuthTokens>
authApi.getMe(): Promise<User>
```

### playlistsApi

```typescript
playlistsApi.getAll(): Promise<Playlist[]>
playlistsApi.getById(id: string): Promise<Playlist>
playlistsApi.create(playlist): Promise<Playlist>
playlistsApi.addGames(playlistId: string, gameIds: string[]): Promise<Playlist>
playlistsApi.removeGames(playlistId: string, gameIds: string[]): Promise<Playlist>
playlistsApi.delete(playlistId: string): Promise<void>
```

### usersApi

```typescript
usersApi.getAll(page?: number, limit?: number): Promise<UsersResponse>
usersApi.getById(id: number): Promise<UserDetails>
usersApi.create(userData: CreateUserData): Promise<UserDetails>
usersApi.update(id: number, userData: UpdateUserData): Promise<UserDetails>
usersApi.delete(id: number): Promise<void>
usersApi.changePassword(id: number, passwordData: ChangePasswordData)
usersApi.getThemeSettings(): Promise<{ mode: string; primaryColor: string }>
usersApi.updateThemeSettings(mode: string, primaryColor: string)
```

### rolesApi

```typescript
rolesApi.getAll(): Promise<Role[]>
rolesApi.getById(id: number): Promise<Role>
rolesApi.getPermissions(): Promise<Permission[]>
rolesApi.create(roleData: CreateRoleData): Promise<Role>
rolesApi.update(id: number, roleData: UpdateRoleData): Promise<Role>
rolesApi.updatePermissions(id: number, permissionIds: number[]): Promise<Role>
rolesApi.delete(id: number): Promise<void>
```

### playTrackingApi

```typescript
playTrackingApi.startSession(gameId: string, gameTitle: string): Promise<StartSessionResponse>
playTrackingApi.endSession(sessionId: string): Promise<EndSessionResponse>
playTrackingApi.getStats(): Promise<UserStats>
playTrackingApi.getGameStats(limit?: number, offset?: number)
playTrackingApi.getHistory(limit?: number, offset?: number)
playTrackingApi.getTopGames(limit?: number): Promise<GameStats[]>
playTrackingApi.getActivityOverTime(days?: number): Promise<PlayActivityData[]>
playTrackingApi.getGamesDistribution(limit?: number): Promise<GameDistribution[]>
```

### domainsApi

```typescript
domainsApi.getAll(): Promise<Domain[]>
domainsApi.add(hostname: string): Promise<Domain>
domainsApi.delete(id: number): Promise<void>
domainsApi.setDefault(id: number): Promise<Domain>
```

## Usage with Custom Hooks

All API calls should use custom hooks wrapping TanStack Query:

```typescript
// Instead of calling API directly
const games = await gamesApi.search(filters);

// Use custom hook
const { data: games, isLoading, error } = useGames(filters);
```

## Error Handling

```typescript
const { data, isLoading, error } = useGames(filters);

if (error) {
  // Handle error
  toast.error('Failed to load games');
}
```

## Type Safety

All API responses are fully typed:

```typescript
interface Game {
  id: string;
  title: string;
  platform: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  // ... more fields
}

interface PaginatedResult<T> {
  games: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Further Reading

- [Backend API Documentation](../06-api-reference/README.md)
- [Custom Hooks](./custom-hooks.md)
