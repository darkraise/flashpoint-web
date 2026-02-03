# Zustand Stores

This document describes the Zustand stores used for client-side state management
in the Flashpoint Web frontend.

## Overview

The application uses three main Zustand stores for different aspects of UI
state:

1. **useAuthStore** - Authentication state, JWT tokens, user permissions
2. **useThemeStore** - Theme mode (light/dark/system), primary color
3. **useUIStore** - Sidebar visibility, view modes, card sizes

All stores use the `persist` middleware to save state to localStorage (or
sessionStorage for guest mode).

## useAuthStore

Manages authentication state, user information, and JWT tokens.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\store\auth.ts`

### State

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;

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

### Usage

```typescript
import { useAuthStore } from '@/store/auth';

function MyComponent() {
  // Select specific state
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Use multiple state values
  const { isGuest, hasPermission } = useAuthStore();

  // Check permissions
  if (hasPermission('games.play')) {
    // Render play button
  }
}
```

### Actions

#### setAuth

Sets authenticated user and tokens after successful login:

```typescript
const { setAuth } = useAuthStore();

const handleLogin = async (credentials) => {
  const response = await authApi.login(credentials);
  setAuth(response.user, {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
};
```

#### setGuestMode

Enables guest mode with limited permissions:

```typescript
const { setGuestMode } = useAuthStore();

setGuestMode();
// Creates a guest user with permissions: ['games.read', 'games.play']
```

#### clearAuth

Logs out the user and clears all auth state:

```typescript
const { clearAuth } = useAuthStore();

const handleLogout = () => {
  clearAuth();
  navigate('/login');
};
```

#### updateAccessToken

Updates the access token (used by refresh token flow):

```typescript
const { updateAccessToken } = useAuthStore();

// Called by axios interceptor
updateAccessToken(newAccessToken);
```

### Permission Helpers

#### hasPermission

Checks if user has a specific permission:

```typescript
const { hasPermission } = useAuthStore();

if (hasPermission('users.manage')) {
  // Show admin panel
}
```

#### hasRole

Checks if user has a specific role:

```typescript
const { hasRole } = useAuthStore();

if (hasRole('admin')) {
  // Show admin features
}
```

#### hasAnyPermission

Checks if user has any of the specified permissions:

```typescript
const { hasAnyPermission } = useAuthStore();

if (hasAnyPermission(['users.read', 'roles.read', 'activities.read'])) {
  // Show management section
}
```

#### hasAllPermissions

Checks if user has all specified permissions:

```typescript
const { hasAllPermissions } = useAuthStore();

if (hasAllPermissions(['users.read', 'users.write', 'users.delete'])) {
  // Show full user management
}
```

### Persistence Strategy

The auth store uses a custom storage strategy that separates guest and
authenticated sessions:

```typescript
storage: createJSONStorage(() => ({
  getItem: (name) => {
    // Check sessionStorage first for guest sessions
    const sessionValue = sessionStorage.getItem(name);
    if (sessionValue) {
      const parsed = JSON.parse(sessionValue);
      if (parsed?.state?.isGuest) {
        return sessionValue;
      }
    }
    // Fall back to localStorage for authenticated sessions
    return localStorage.getItem(name);
  },
  setItem: (name, value) => {
    const parsed = JSON.parse(value);
    if (parsed?.state?.isGuest) {
      // Guest sessions go to sessionStorage only
      sessionStorage.setItem(name, value);
    } else {
      // Authenticated sessions go to localStorage
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
}));
```

**Benefits:**

- Guest sessions cleared on browser close (sessionStorage)
- Authenticated sessions persist across browser restarts (localStorage)
- Prevents guest data from polluting localStorage

### Theme Loading on Login

After successful login, the auth store automatically loads theme settings from
the server:

```typescript
setAuth: (user: User, tokens: AuthTokens) => {
  set({
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    isAuthenticated: true,
    isGuest: false,
  });

  // Load theme settings from server
  const themeStore = useThemeStore.getState();
  themeStore.loadThemeFromServer().catch((error) => {
    console.debug('Failed to load theme settings after login:', error);
  });
};
```

## useThemeStore

Manages theme mode (light/dark/system) and primary color selection.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\store\theme.ts`

### State

```typescript
interface ThemeState {
  mode: ThemeMode; // 'light' | 'dark' | 'system'
  primaryColor: PrimaryColor; // 21 color options
  isLoading: boolean;

  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  loadThemeFromServer: () => Promise<void>;
  syncThemeToServer: () => Promise<void>;
}
```

### Primary Colors

21 color options available:

```typescript
export type PrimaryColor =
  | 'blue' // Default
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

Each color has light and dark mode variants stored as HSL values:

```typescript
export const colorPalette: Record<
  PrimaryColor,
  { light: string; dark: string; label: string }
> = {
  blue: {
    light: '221.2 83.2% 53.3%',
    dark: '217.2 91.2% 59.8%',
    label: 'Blue',
  },
  red: { light: '0 72.2% 50.6%', dark: '0 72.2% 60.6%', label: 'Red' },
  // ... 19 more colors
};
```

### Usage

```typescript
import { useThemeStore } from '@/store/theme';

function ThemePicker() {
  const { mode, setMode } = useThemeStore();

  return (
    <select value={mode} onChange={(e) => setMode(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

### Actions

#### setMode

Changes theme mode and applies to document:

```typescript
const { setMode } = useThemeStore();

setMode('dark'); // Immediately applies dark theme
```

Automatically:

- Updates CSS classes on `<html>` element
- Reapplies primary color for new theme
- Syncs to server (if authenticated)

#### setPrimaryColor

Changes primary color and applies to CSS variables:

```typescript
const { setPrimaryColor } = useThemeStore();

setPrimaryColor('emerald'); // Applies emerald color theme
```

Automatically:

- Updates `--primary` and `--ring` CSS variables
- Syncs to server (if authenticated)

#### loadThemeFromServer

Loads user's saved theme settings from server:

```typescript
const { loadThemeFromServer } = useThemeStore();

await loadThemeFromServer();
```

Called automatically:

- After successful login
- On app rehydration (if authenticated)

#### syncThemeToServer

Saves current theme settings to server:

```typescript
const { syncThemeToServer } = useThemeStore();

await syncThemeToServer();
```

Called automatically:

- When mode changes
- When primary color changes
- Silent failure if not authenticated

### Theme Application

Theme is applied by modifying CSS classes and custom properties:

```typescript
const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark');

  // Determine actual theme (resolve 'system')
  const actualTheme: 'light' | 'dark' = mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : mode;

  // Apply theme class
  root.classList.add(actualTheme);
};

const applyPrimaryColor = (color: PrimaryColor, currentMode: ThemeMode) => {
  const root = document.documentElement;
  const actualTheme = /* determine actual theme */;

  const colorValue = colorPalette[color][actualTheme];

  // Apply CSS variables
  root.style.setProperty('--primary', colorValue);
  root.style.setProperty('--ring', colorValue);
};
```

### System Theme Listener

Listens for system theme changes when in 'system' mode:

```typescript
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      applyTheme('system');
      applyPrimaryColor(state.primaryColor, 'system');
    }
  });
```

### Persistence

Theme state is persisted to localStorage:

```typescript
persist(
  (set, get) => ({
    /* ... */
  }),
  {
    name: 'flashpoint-theme-settings',
    partialize: (state) => ({
      mode: state.mode,
      primaryColor: state.primaryColor,
    }),
    onRehydrateStorage: () => (state) => {
      if (state) {
        // Apply theme after rehydration
        applyTheme(state.mode);
        applyPrimaryColor(state.primaryColor, state.mode);

        // Load from server if authenticated
        state.loadThemeFromServer().catch((error) => {
          console.debug('Failed to load theme from server:', error);
        });
      }
    },
  }
);
```

## useUIStore

Manages UI state like sidebar visibility, view modes, and display preferences.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\store\ui.ts`

### State

```typescript
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  viewMode: ViewMode; // 'grid' | 'list'
  selectedGameId: string | null;
  cardSize: CardSize; // 'small' | 'medium' | 'large'
  listColumns: ListColumns; // 1 | 2 | 3 | 4

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

### Usage

```typescript
import { useUIStore } from '@/store/ui';

function GameBrowseLayout() {
  const viewMode = useUIStore((state) => state.viewMode);
  const cardSize = useUIStore((state) => state.cardSize);
  const setViewMode = useUIStore((state) => state.setViewMode);

  return (
    <div>
      <button onClick={() => setViewMode('grid')}>Grid View</button>
      <button onClick={() => setViewMode('list')}>List View</button>

      {viewMode === 'grid' ? (
        <GameGrid cardSize={cardSize} />
      ) : (
        <GameList />
      )}
    </div>
  );
}
```

### Actions

#### Sidebar Actions

```typescript
const {
  sidebarOpen,
  toggleSidebar,
  setSidebarOpen,
  sidebarCollapsed,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
} = useUIStore();

// Toggle sidebar open/closed (mobile)
toggleSidebar();

// Set specific state
setSidebarOpen(true);

// Toggle collapsed width (desktop)
toggleSidebarCollapsed();
```

#### View Mode Actions

```typescript
const { viewMode, setViewMode } = useUIStore();

setViewMode('grid'); // Switch to grid view
setViewMode('list'); // Switch to list view
```

#### Card Size Actions

```typescript
const { cardSize, setCardSize } = useUIStore();

setCardSize('small'); // Smaller cards
setCardSize('medium'); // Medium cards (default)
setCardSize('large'); // Larger cards
```

#### List Columns Actions

```typescript
const { listColumns, setListColumns } = useUIStore();

setListColumns(1); // Single column
setListColumns(2); // Two columns
setListColumns(3); // Three columns
setListColumns(4); // Four columns
```

### Default Values

```typescript
{
  sidebarOpen: window.innerWidth >= 1024,  // Open on desktop, closed on mobile
  sidebarCollapsed: false,
  viewMode: 'grid',
  selectedGameId: null,
  cardSize: 'medium',
  listColumns: 1
}
```

### Persistence

UI state is persisted to localStorage:

```typescript
persist(
  (set) => ({
    /* ... */
  }),
  {
    name: 'flashpoint-ui-settings',
    partialize: (state) => ({
      sidebarOpen: state.sidebarOpen,
      sidebarCollapsed: state.sidebarCollapsed,
      cardSize: state.cardSize,
      viewMode: state.viewMode,
      listColumns: state.listColumns,
      // selectedGameId is intentionally not persisted
    }),
  }
);
```

## Best Practices

### 1. Selective State Subscription

Only subscribe to the state you need:

```typescript
// Good - only re-renders when mode changes
const mode = useThemeStore((state) => state.mode);

// Bad - re-renders on any theme store change
const themeStore = useThemeStore();
```

### 2. Access Store Outside Components

Use `getState()` for non-reactive access:

```typescript
// In axios interceptor
const token = useAuthStore.getState().accessToken;
```

### 3. Batch Updates

Zustand automatically batches state updates:

```typescript
setAuth(user, tokens); // Single update, single re-render
```

### 4. DevTools Integration

Enable Redux DevTools for debugging:

```typescript
import { devtools } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  devtools(persist(/* ... */), { name: 'Auth Store' })
);
```

## Further Reading

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Query Documentation](./react-query.md)
- [URL State Documentation](./url-state.md)
- [API Client Documentation](../api-client.md)
