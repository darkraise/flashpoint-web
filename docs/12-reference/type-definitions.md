# Type Definitions Reference

This document provides a comprehensive reference for all major TypeScript types and interfaces used throughout the Flashpoint Web application.

## Table of Contents

- [Game Types](#game-types)
- [Authentication Types](#authentication-types)
- [User Management Types](#user-management-types)
- [Play Tracking Types](#play-tracking-types)
- [UI State Types](#ui-state-types)
- [Theme Types](#theme-types)
- [Pagination Types](#pagination-types)
- [JWT Types](#jwt-types)
- [API Response Types](#api-response-types)

---

## Game Types

Types related to game metadata, browsing, and playback.

### Game

Core game entity from the Flashpoint database.

**Source:** `frontend/src/types/game.ts`

```typescript
export interface Game {
  id: string;                          // UUID
  parentGameId?: string;               // Parent game UUID (for extras/mods)
  title: string;                       // Game title
  alternateTitles?: string;            // Semicolon-separated alternate titles
  series?: string;                     // Series name
  developer: string;                   // Developer name
  publisher: string;                   // Publisher name
  platformName?: string;               // Primary platform (e.g., "Flash", "HTML5")
  platformsStr?: string;               // Semicolon-separated platforms
  platformId?: number;                 // Foreign key to platform table
  playMode?: string;                   // Play mode (e.g., "Single Player")
  status?: string;                     // Status (e.g., "Playable", "Broken")
  broken?: boolean;                    // Whether game is marked as broken
  extreme?: boolean;                   // Whether game contains extreme content
  notes?: string;                      // Notes about the game
  tagsStr?: string;                    // Semicolon-separated tags
  source?: string;                     // Source/origin information
  applicationPath?: string;            // Application path for native games
  launchCommand?: string;              // Launch command/URL
  releaseDate?: string;                // Release date (YYYY-MM-DD)
  version?: string;                    // Game version
  originalDescription?: string;        // Original description
  language?: string;                   // Language(s)
  library: string;                     // Library (e.g., "arcade", "theatre")
  orderTitle: string;                  // Normalized title for sorting
  dateAdded?: string;                  // Date added to Flashpoint (ISO 8601)
  dateModified?: string;               // Last modification date (ISO 8601)
  presentOnDisk?: number | null;       // Download status: null = no data needed,
                                       // 0 = needs download, 1 = downloaded
  lastPlayed?: string;                 // Last played timestamp (user-specific)
  playtime?: number;                   // Total playtime in seconds (user-specific)
  playCounter?: number;                // Play count (user-specific)
  archiveState?: number;               // Archive state indicator
  logoPath?: string;                   // Relative path to logo image
  screenshotPath?: string;             // Relative path to screenshot image
}
```

### GameFilters

Query parameters for filtering and searching games.

**Source:** `frontend/src/types/game.ts`

```typescript
export interface GameFilters {
  search?: string;           // Search query (searches title, developer, publisher)
  platform?: string;         // Platform name filter
  series?: string;           // Comma-separated series names
  developers?: string;       // Comma-separated developer names
  publishers?: string;       // Comma-separated publisher names
  playModes?: string;        // Comma-separated play modes
  languages?: string;        // Comma-separated languages
  library?: string;          // Library filter (e.g., "arcade")
  tags?: string;             // Comma-separated tags
  yearFrom?: number;         // Minimum release year
  yearTo?: number;           // Maximum release year
  sortBy?: string;           // Sort field (e.g., "title", "dateAdded", "releaseDate")
  sortOrder?: 'asc' | 'desc'; // Sort direction
  page?: number;             // Page number (1-indexed)
  limit?: number;            // Results per page
}
```

### FilterOptions

Available filter options with counts for faceted search.

**Source:** `frontend/src/types/game.ts`

```typescript
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
```

### Playlist

Game playlist entity.

**Source:** `frontend/src/types/game.ts`

```typescript
export interface Playlist {
  id: string;              // UUID
  title: string;           // Playlist title
  description?: string;    // Playlist description
  author?: string;         // Playlist author
  library?: string;        // Library classification
  icon?: string;           // Icon identifier
  games?: Game[];          // Populated game objects (optional)
  gameIds?: string[];      // Game IDs in playlist (optional)
}
```

### GameLaunchData

Data needed to launch a game in the player.

**Source:** `frontend/src/types/game.ts`

```typescript
export interface GameLaunchData {
  gameId: string;             // Game UUID
  title: string;              // Game title
  platform?: string;          // Platform name
  launchCommand: string;      // Launch command/URL
  contentUrl: string;         // URL to game content (via game-service)
  applicationPath?: string;   // Application path (for reference)
  playMode?: string;          // Play mode
  canPlayInBrowser: boolean;  // Whether game can be played in browser
}
```

---

## Authentication Types

Types for authentication, authorization, and user sessions.

### User (Frontend)

Authenticated user data stored in frontend state.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface User {
  id: number;                   // User ID
  username: string;             // Username
  email: string;                // Email address
  role: string;                 // Role name (e.g., "admin", "user", "guest")
  permissions: string[];        // Array of permission names
}
```

### User (Backend)

Complete user record from database.

**Source:** `backend/src/types/auth.ts`

```typescript
export interface User {
  id: number;                   // User ID
  username: string;             // Username
  email: string;                // Email address
  roleId: number;               // Foreign key to roles table
  roleName: string;             // Role name
  isActive: boolean;            // Account active status
  createdAt: string;            // Account creation timestamp (ISO 8601)
  updatedAt: string;            // Last update timestamp (ISO 8601)
  lastLoginAt?: string;         // Last login timestamp (ISO 8601)
  themeColor?: string;          // Theme color preference (deprecated)
  surfaceColor?: string;        // Surface color preference (deprecated)
}
```

### AuthUser

Simplified user object for JWT payload and API responses.

**Source:** `backend/src/types/auth.ts`

```typescript
export interface AuthUser {
  id: number;                   // User ID
  username: string;             // Username
  email: string;                // Email address
  role: string;                 // Role name
  permissions: string[];        // Array of permission names
  themeColor?: string;          // Theme color preference (deprecated)
  surfaceColor?: string;        // Surface color preference (deprecated)
}
```

### AuthTokens

JWT token pair returned after authentication.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface AuthTokens {
  accessToken: string;          // Short-lived JWT access token
  refreshToken: string;         // Long-lived refresh token
  expiresIn: number;            // Access token expiration time in seconds
}
```

### LoginCredentials

User login credentials.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface LoginCredentials {
  username: string;             // Username
  password: string;             // Password (plain text, sent over HTTPS)
}
```

### RegisterData

User registration data.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface RegisterData {
  username: string;             // Desired username
  email: string;                // Email address
  password: string;             // Password (plain text, sent over HTTPS)
}
```

### LoginResponse

Response from login endpoint.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface LoginResponse {
  user: User;                   // Authenticated user data
  tokens: AuthTokens;           // JWT token pair
}
```

### RegisterResponse

Response from registration endpoint.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface RegisterResponse {
  user: User;                   // Newly created user data
  tokens: AuthTokens;           // JWT token pair
}
```

---

## User Management Types

Types for managing users, roles, and permissions.

### UserDetails

Complete user information for admin interfaces.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface UserDetails {
  id: number;                   // User ID
  username: string;             // Username
  email: string;                // Email address
  roleId: number;               // Foreign key to roles table
  roleName: string;             // Role name
  isActive: boolean;            // Account active status
  createdAt: string;            // Account creation timestamp (ISO 8601)
  updatedAt: string;            // Last update timestamp (ISO 8601)
  lastLoginAt: string | null;   // Last login timestamp (ISO 8601)
}
```

### CreateUserData

Data for creating a new user account.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface CreateUserData {
  username: string;             // Username
  email: string;                // Email address
  password: string;             // Password (plain text, sent over HTTPS)
  roleId: number;               // Role to assign
  isActive?: boolean;           // Account active status (default: true)
}
```

### UpdateUserData

Data for updating an existing user account.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface UpdateUserData {
  email?: string;               // New email address
  roleId?: number;              // New role ID
  isActive?: boolean;           // New active status
}
```

### ChangePasswordData

Data for changing a user's password.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface ChangePasswordData {
  currentPassword: string;      // Current password for verification
  newPassword: string;          // New password
}
```

### Permission

Permission definition.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface Permission {
  id: number;                   // Permission ID
  name: string;                 // Permission name (e.g., "games.play")
  description: string;          // Permission description
  resource: string;             // Resource type (e.g., "games")
  action: string;               // Action type (e.g., "read", "create")
  createdAt: string;            // Creation timestamp (backend only)
}
```

### Role

Role definition with permissions.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface Role {
  id: number;                   // Role ID
  name: string;                 // Role name (e.g., "admin", "user")
  description: string;          // Role description
  priority: number;             // Role priority (higher = more privileged)
  permissions: Permission[];    // Array of assigned permissions
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last update timestamp
}
```

### CreateRoleData

Data for creating a new role.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface CreateRoleData {
  name: string;                 // Role name
  description?: string;         // Role description
  priority?: number;            // Role priority (default: 0)
  permissionIds?: number[];     // Permission IDs to assign
}
```

### UpdateRoleData

Data for updating an existing role.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface UpdateRoleData {
  name?: string;                // New role name
  description?: string;         // New description
  priority?: number;            // New priority
}
```

### ActivityLog

Activity log entry for audit trail.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface ActivityLog {
  id: number;                   // Log entry ID
  userId: number | null;        // User ID (null for unauthenticated actions)
  username: string | null;      // Username snapshot
  action: string;               // Action performed (e.g., "login", "game.play")
  resource: string | null;      // Resource type affected
  resourceId: string | null;    // Resource ID affected
  details: string | null;       // Additional details (JSON or text)
  ipAddress: string | null;     // Client IP address
  userAgent: string | null;     // Client user agent
  createdAt: string;            // Action timestamp (ISO 8601)
}
```

### ActivityFilters

Query filters for activity logs.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface ActivityFilters {
  userId?: number;              // Filter by user ID
  username?: string;            // Filter by username
  action?: string;              // Filter by action type
  resource?: string;            // Filter by resource type
  startDate?: string;           // Filter by start date (ISO 8601)
  endDate?: string;             // Filter by end date (ISO 8601)
}
```

### AuthSettings

Global authentication configuration.

**Source:** `frontend/src/types/auth.ts` and `backend/src/types/auth.ts`

```typescript
export interface AuthSettings {
  guestAccessEnabled: boolean;           // Allow guest browsing
  userRegistrationEnabled: boolean;      // Allow new user registration
  requireEmailVerification: boolean;     // Require email verification
  sessionTimeoutMinutes: number;         // JWT access token timeout
  maxLoginAttempts: number;              // Max failed login attempts before lockout
  lockoutDurationMinutes: number;        // Account lockout duration
  updatedAt: string;                     // Last update timestamp
  updatedBy: number | null;              // User ID who last updated settings
}
```

### UpdateAuthSettingsData

Data for updating authentication settings.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface UpdateAuthSettingsData {
  guestAccessEnabled?: boolean;
  userRegistrationEnabled?: boolean;
  requireEmailVerification?: boolean;
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
}
```

---

## Play Tracking Types

Types for tracking and analyzing game play sessions.

### PlaySession

Individual play session record.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface PlaySession {
  id: number;                   // Session ID
  userId: number;               // User ID
  gameId: string;               // Game UUID
  gameTitle: string;            // Game title snapshot
  startedAt: string;            // Session start timestamp (ISO 8601)
  endedAt: string | null;       // Session end timestamp (null = active/abandoned)
  durationSeconds: number | null; // Session duration in seconds
  sessionId: string;            // Unique session identifier (UUID)
}
```

### GameStats

Aggregated statistics for a specific game.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface GameStats {
  gameId: string;               // Game UUID
  gameTitle: string;            // Game title
  totalPlays: number;           // Total play sessions
  totalPlaytimeSeconds: number; // Total playtime in seconds
  firstPlayedAt: string;        // First play timestamp (ISO 8601)
  lastPlayedAt: string;         // Last play timestamp (ISO 8601)
}
```

### UserStats

Overall user play statistics.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface UserStats {
  userId: number;               // User ID
  totalGamesPlayed: number;     // Total unique games played
  totalPlaytimeSeconds: number; // Total playtime across all games
  totalSessions: number;        // Total play sessions
  firstPlayAt: string | null;   // First play timestamp (ISO 8601)
  lastPlayAt: string | null;    // Last play timestamp (ISO 8601)
}
```

### StartSessionResponse

Response from session start endpoint.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface StartSessionResponse {
  success: boolean;             // Whether session started successfully
  sessionId: string;            // Unique session identifier (UUID)
}
```

### EndSessionResponse

Response from session end endpoint.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface EndSessionResponse {
  success: boolean;             // Whether session ended successfully
  message: string;              // Response message
}
```

### PlayActivityData

Play activity data for charts and graphs.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface PlayActivityData {
  date: string;                 // Date (YYYY-MM-DD)
  playtime: number;             // Total playtime in seconds for this date
  sessions: number;             // Total sessions for this date
}
```

### GameDistribution

Game distribution data for charts.

**Source:** `frontend/src/types/play-tracking.ts`

```typescript
export interface GameDistribution {
  name: string;                 // Category name (e.g., platform, series)
  value: number;                // Count or percentage
}
```

---

## UI State Types

Types for UI state management (Zustand stores).

### CardSize

Card size option for grid views.

**Source:** `frontend/src/store/ui.ts`

```typescript
export type CardSize = 'small' | 'medium' | 'large';
```

### ViewMode

View mode for game browsing.

**Source:** `frontend/src/store/ui.ts`

```typescript
export type ViewMode = 'grid' | 'list';
```

### ListColumns

Number of columns for list view.

**Source:** `frontend/src/store/ui.ts`

```typescript
export type ListColumns = 1 | 2 | 3 | 4;
```

### UIState

Complete UI state interface.

**Source:** `frontend/src/store/ui.ts`

```typescript
interface UIState {
  // State
  sidebarOpen: boolean;              // Sidebar visibility
  sidebarCollapsed: boolean;         // Sidebar collapsed state
  viewMode: ViewMode;                // Current view mode
  selectedGameId: string | null;     // Currently selected game ID
  cardSize: CardSize;                // Grid card size
  listColumns: ListColumns;          // List view columns

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedGame: (id: string | null) => void;
  setCardSize: (size: CardSize) => void;
  setListColumns: (columns: ListColumns) => void;
}
```

### AuthState

Authentication state interface.

**Source:** `frontend/src/store/auth.ts`

```typescript
interface AuthState {
  // State
  user: User | null;                      // Authenticated user
  accessToken: string | null;             // JWT access token
  refreshToken: string | null;            // Refresh token
  isAuthenticated: boolean;               // Authentication status
  isGuest: boolean;                       // Guest mode status

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  setGuestMode: () => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
  updateUser: (user: User) => void;

  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}
```

---

## Theme Types

Types for theme and color customization.

### ThemeMode

Theme mode options.

**Source:** `frontend/src/store/theme.ts`

```typescript
export type ThemeMode = 'light' | 'dark' | 'system';
```

### PrimaryColor

Available primary color options.

**Source:** `frontend/src/store/theme.ts`

```typescript
export type PrimaryColor =
  | 'blue'      // Default
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
```

### ColorPalette

Color palette definition with light and dark mode values.

**Source:** `frontend/src/store/theme.ts`

```typescript
export const colorPalette: Record<PrimaryColor, {
  light: string;   // HSL values for light mode
  dark: string;    // HSL values for dark mode
  label: string;   // Display label
}>;
```

### ThemeState

Theme state interface.

**Source:** `frontend/src/store/theme.ts`

```typescript
interface ThemeState {
  // State
  mode: ThemeMode;                      // Current theme mode
  primaryColor: PrimaryColor;           // Current primary color
  isLoading: boolean;                   // Theme loading state

  // Actions
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  loadThemeFromServer: () => Promise<void>;
  syncThemeToServer: () => Promise<void>;
}
```

---

## Pagination Types

Types for paginated API responses.

### PaginatedResult

Generic paginated result (legacy format).

**Source:** `frontend/src/types/game.ts`

```typescript
export interface PaginatedResult<T> {
  data: T[];                    // Array of results
  total: number;                // Total number of results
  page: number;                 // Current page (1-indexed)
  limit: number;                // Results per page
  totalPages: number;           // Total number of pages
}
```

### PaginationMetadata

Standardized pagination metadata.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface PaginationMetadata {
  total: number;                // Total number of results
  page: number;                 // Current page (1-indexed)
  limit: number;                // Results per page
  totalPages: number;           // Total number of pages
}
```

### PaginatedResponse

Standardized paginated response.

**Source:** `frontend/src/types/auth.ts` and `backend/src/utils/pagination.ts`

```typescript
export interface PaginatedResponse<T> {
  data: T[];                    // Array of results
  pagination: PaginationMetadata; // Pagination metadata
}
```

### UsersResponse

Specialized paginated response for users.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface UsersResponse {
  data: UserDetails[];          // Array of user details
  pagination: PaginationMetadata; // Pagination metadata
}
```

### ActivitiesResponse

Specialized paginated response for activity logs.

**Source:** `frontend/src/types/auth.ts`

```typescript
export interface ActivitiesResponse {
  data: ActivityLog[];          // Array of activity logs
  pagination: PaginationMetadata; // Pagination metadata
}
```

---

## JWT Types

Types for JSON Web Token handling.

### JWTPayload

JWT access token payload.

**Source:** `backend/src/utils/jwt.ts`

```typescript
export interface JWTPayload {
  userId: number;               // User ID
  username: string;             // Username
  role: string;                 // Role name

  // Standard JWT claims (added by jsonwebtoken library):
  // iat: number;               // Issued at timestamp
  // exp: number;               // Expiration timestamp
}
```

---

## API Response Types

Common API response formats.

### SuccessResponse

Generic success response.

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

### ErrorResponse

Generic error response.

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}
```

### ValidationErrorResponse

Validation error response.

```typescript
interface ValidationErrorResponse {
  success: false;
  error: 'ValidationError';
  message: string;
  fields?: Record<string, string[]>; // Field-specific errors
}
```

---

## Utility Types

### Optional and Partial Utilities

TypeScript provides built-in utility types used throughout the codebase:

- `Partial<T>` - All properties optional
- `Required<T>` - All properties required
- `Pick<T, K>` - Select specific properties
- `Omit<T, K>` - Exclude specific properties
- `Record<K, V>` - Object type with specific keys and values

### Example Usage

```typescript
// Create type without password field
type UserWithoutPassword = Omit<User, 'password_hash'>;

// Create type with only specific fields
type UserSummary = Pick<User, 'id' | 'username' | 'email'>;

// Create type with all optional fields
type PartialUserUpdate = Partial<UpdateUserData>;
```

---

## Type Guards

Type guard functions for runtime type checking.

### Example Type Guards

```typescript
// Check if user is authenticated
function isAuthenticatedUser(user: User | null): user is User {
  return user !== null && user.id > 0;
}

// Check if response is error
function isErrorResponse(response: any): response is ErrorResponse {
  return response.success === false && 'error' in response;
}

// Check if game is playable
function isPlayableGame(game: Game): boolean {
  return !game.broken && game.library !== 'theatre';
}
```

---

## Related Documentation

- [Database Schema Reference](./database-schema-reference.md)
- [API Reference](../06-api-reference/README.md)
- [Frontend State Management](../04-frontend/state-management/zustand-stores.md)
- [Backend Services](../03-backend/services/README.md)
