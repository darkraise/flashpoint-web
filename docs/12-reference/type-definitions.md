# Type Definitions Reference

Core TypeScript types and interfaces used throughout Flashpoint Web.

## Game Types

```typescript
// Core game entity from Flashpoint database
export interface Game {
  id: string;
  parentGameId?: string;
  title: string;
  alternateTitles?: string;
  series?: string;
  developer: string;
  publisher: string;
  platformName?: string;
  platformsStr?: string;
  platformId?: number;
  playMode?: string;
  status?: string;
  broken?: boolean;
  extreme?: boolean;
  notes?: string;
  tagsStr?: string;
  source?: string;
  applicationPath?: string;
  launchCommand?: string;
  releaseDate?: string;
  version?: string;
  originalDescription?: string;
  language?: string;
  library: string;
  orderTitle: string;
  dateAdded?: string;
  dateModified?: string;
  presentOnDisk?: number | null;
  lastPlayed?: string;
  playtime?: number;
  playCounter?: number;
  archiveState?: number;
  logoPath?: string;
  screenshotPath?: string;
}

// Query parameters for filtering games
export interface GameFilters {
  search?: string;
  platform?: string;
  series?: string;
  developers?: string;
  publishers?: string;
  playModes?: string;
  languages?: string;
  library?: string;
  tags?: string;
  yearFrom?: number;
  yearTo?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  signal?: AbortSignal; // Optional abort signal for request cancellation
}

// Filter options with counts
export interface FilterOptions {
  series: Array<{ name: string; count: number }>;
  developers: Array<{ name: string; count: number }>;
  publishers: Array<{ name: string; count: number }>;
  playModes: Array<{ name: string; count: number }>;
  languages: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  platforms: Array<{ name: string; count: number }>;
  yearRange: { min: number; max: number };
}

// Game playlist
export interface Playlist {
  id: string;
  title: string;
  description?: string;
  author?: string;
  library?: string;
  icon?: string;
  games?: Game[];
  gameIds?: string[];
}

// Data needed to launch game
export interface GameLaunchData {
  gameId: string;
  title: string;
  platform?: string;
  launchCommand: string;
  contentUrl: string;
  applicationPath?: string;
  playMode?: string;
  canPlayInBrowser: boolean;
  /** True when the game ZIP is being downloaded in the background */
  downloading?: boolean;
}
```

## Authentication Types

```typescript
// Authenticated user (Frontend)
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

// Complete user (Backend)
export interface User {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  themeColor?: string;
  surfaceColor?: string;
}

// JWT token pair
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  // refreshToken is stored in HTTP-only cookie, not included in response
}

// Login credentials
export interface LoginCredentials {
  username: string;
  password: string;
}

// Registration data
export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// JWT payload
export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  // iat, exp added by library
}
```

## User Management Types

```typescript
// Complete user for admin interfaces
export interface UserDetails {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// Create user data
export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}

// Update user data
export interface UpdateUserData {
  email?: string;
  roleId?: number;
  isActive?: boolean;
}

// Change password
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Permission definition
export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt?: string;
}

// Role with permissions
export interface Role {
  id: number;
  name: string;
  description: string;
  priority: number;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

// Activity log entry
export interface ActivityLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Authentication settings
export interface AuthSettings {
  guestAccessEnabled: boolean;
  userRegistrationEnabled: boolean;
  requireEmailVerification: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  updatedAt: string;
  updatedBy: number | null;
}
```

## Play Tracking Types

```typescript
// Individual play session
export interface PlaySession {
  id: number;
  userId: number;
  gameId: string;
  gameTitle: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  sessionId: string;
}

// Aggregated game statistics
export interface GameStats {
  gameId: string;
  gameTitle: string;
  totalPlays: number;
  totalPlaytimeSeconds: number;
  firstPlayedAt: string;
  lastPlayedAt: string;
}

// Overall user statistics
export interface UserStats {
  userId: number;
  totalGamesPlayed: number;
  totalPlaytimeSeconds: number;
  totalSessions: number;
  firstPlayAt: string | null;
  lastPlayAt: string | null;
}

// Session start response
export interface StartSessionResponse {
  success: boolean;
  sessionId: string;
}

// Play activity data
export interface PlayActivityData {
  date: string;
  playtime: number;
  sessions: number;
}
```

## UI State Types

```typescript
// Card size options
export type CardSize = 'small' | 'medium' | 'large';

// View mode
export type ViewMode = 'grid' | 'list';

// List columns
export type ListColumns = 1 | 2 | 3 | 4;

// UI State (Zustand)
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  selectedGameId: string | null;
  cardSize: CardSize;
  listColumns: ListColumns;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedGame: (id: string | null) => void;
  setCardSize: (size: CardSize) => void;
  setListColumns: (columns: ListColumns) => void;
}

// Auth State (Zustand)
interface AuthState {
  user: User | null;
  accessToken: string | null; // Memory-only, not persisted
  isAuthenticated: boolean;
  isGuest: boolean;
  isMaintenanceMode: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setGuestMode: () => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}
```

## Theme Types

```typescript
// Theme mode
export type ThemeMode = 'light' | 'dark' | 'system';

// Primary colors
export type PrimaryColor =
  | 'blue'
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

// Theme State (Zustand)
interface ThemeState {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  isLoading: boolean;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  loadThemeFromServer: () => Promise<void>;
  syncThemeToServer: () => Promise<void>;
}
```

## Pagination Types

```typescript
// Generic paginated result
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Pagination metadata
export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Standard paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}
```

## API Response Types

```typescript
// Generic success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Generic error response
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}

// Validation error response
interface ValidationErrorResponse {
  success: false;
  error: 'ValidationError';
  message: string;
  fields?: Record<string, string[]>;
}
```

## Global Type Augmentations

### Ruffle Flash Emulator

The Ruffle Flash emulator is loaded via `<script>` tag and extends the global Window object. Type augmentation enables full TypeScript support:

```typescript
// Declared in src/types/ruffle.d.ts
declare global {
  interface Window {
    RufflePlayer: {
      newest: () => RufflePlayerFactory;
    };
  }
}

interface RufflePlayerFactory {
  create: (options: RuffleCreateOptions) => RuffleInstance;
}

interface RuffleCreateOptions {
  allowScriptAccess?: boolean;
  allowNetworking?: string;
  allowFullScreen?: boolean;
  wmode?: 'direct' | 'opaque' | 'transparent' | 'window';
  scale?: 'exactfit' | 'noScaling' | 'noborder' | 'showAll';
  [key: string]: any;
}

interface RuffleInstance {
  play(): void;
  pause(): void;
  stop(): void;
  destroy(): void;
}
```

**Usage in components:**

```typescript
// Full type safety with autocomplete
const ruffle = window.RufflePlayer.newest().create({
  allowScriptAccess: true,
  scale: 'noborder',
});

ruffle.play(); // ✅ Type-safe
```

## Utility Types

```typescript
// TypeScript built-in utilities
type Partial<T> = Partial record with all optional properties
type Required<T> = All properties required
type Pick<T, K> = Select specific properties
type Omit<T, K> = Exclude specific properties
type Record<K, V> = Object with specific keys and value type
```

## Related Documentation

- [Database Schema](./database-schema-reference.md)
- [API Reference](../06-api-reference/README.md)
- [Frontend State Management](../04-frontend/state-management/zustand-stores.md)
