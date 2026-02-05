# Frontend Architecture

This document describes the architectural patterns, design decisions, and
technical implementation details of the Flashpoint Web frontend.

## Architecture Overview

The frontend follows a modern React architecture with clear separation of
concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│  (Views/Pages - Route-based code splitting)                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                     Component Layer                          │
│  (Layout, Game, Auth, Player, UI Components)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                   State Management Layer                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Zustand   │  │  TanStack    │  │  URL State   │       │
│  │  (UI State) │  │  Query       │  │  (Filters)   │       │
│  │             │  │ (Server Data)│  │              │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                      Data Layer                              │
│  (API Client with Axios, Request/Response Interceptors)     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                    Backend API                               │
│              (REST API on port 3100)                         │
└─────────────────────────────────────────────────────────────┘
```

## Core Architectural Patterns

### 1. Component Architecture

#### Component Organization

Components are organized by domain and responsibility:

```
components/
├── auth/          # Authentication (LoginForm, RegisterForm, ProtectedRoute)
├── common/        # Shared utilities (ErrorBoundary, RoleGuard, ConfirmDialog)
├── game/          # Game-specific (GameInfoGrid)
├── layout/        # Layout structure (AppShell, Header, Sidebar)
├── library/       # Game browsing (GameCard, GameGrid, GameList)
├── player/        # Game players (GamePlayer, RufflePlayer)
├── playlist/      # Playlist management (CreatePlaylistModal, AddToPlaylistModal)
├── search/        # Search/filtering (SearchBar, FilterPanel)
├── stats/         # Statistics charts (UserStatsPanel, TopGamesChart)
├── theme/         # Theme controls (ThemePicker, PrimaryColorPicker)
└── ui/            # Shadcn UI primitives (Button, Card, Dialog, etc.)
```

#### Component Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Composition over Inheritance**: Build complex UIs from simple components
3. **Props over State**: Prefer controlled components with props
4. **TypeScript Interfaces**: All props are strictly typed
5. **Separation of Concerns**: Presentation logic separate from business logic

### 2. State Management Strategy

The application uses a **three-tier state management approach**:

#### Tier 1: Server State (TanStack Query)

All server-side data (games, playlists, users) is managed by TanStack Query:

**Benefits:**

- Automatic caching with configurable stale times
- Background refetching
- Request deduplication
- Optimistic updates
- Loading and error states

**Configuration:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Usage Pattern:**

```typescript
// Custom hook wrapping TanStack Query
export function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.search(filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

#### Tier 2: UI State (Zustand)

Client-side UI state (authentication, theme, sidebar) uses Zustand:

**Benefits:**

- Minimal boilerplate
- No providers needed
- Built-in TypeScript support
- Middleware for persistence
- DevTools integration

**Stores:**

1. **useAuthStore** - Authentication state, JWT tokens, permissions
2. **useThemeStore** - Theme mode (light/dark/system), primary color
3. **useUIStore** - Sidebar collapsed state, view modes, card sizes

**Persistence Strategy:**

```typescript
persist(
  (set, get) => ({
    // state and actions
  }),
  {
    name: 'flashpoint-auth',
    storage: createJSONStorage(() => ({
      getItem: (name) => {
        // Guest sessions use sessionStorage
        // Authenticated sessions use localStorage
      },
      setItem: (name, value) => {
        /* ... */
      },
      removeItem: (name) => {
        /* ... */
      },
    })),
  }
);
```

#### Tier 3: URL State (React Router)

Filter state and pagination are stored in URL search params:

**Benefits:**

- Shareable URLs
- Browser back/forward support
- No client-side state management needed
- SEO-friendly

**Usage Pattern:**

```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Read from URL
const platform = searchParams.get('platform') || 'all';
const page = parseInt(searchParams.get('page') || '1');

// Update URL
const updateFilters = (newFilters: Partial<GameFilters>) => {
  const params = new URLSearchParams(searchParams);
  Object.entries(newFilters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
    else params.delete(key);
  });
  setSearchParams(params);
};
```

### 3. Routing Architecture

#### Route Configuration

Routes are defined in `App.tsx` with nested routing structure:

```typescript
<Routes>
  {/* Auth routes (no AppShell) */}
  <Route path="/login" element={<LoginView />} />
  <Route path="/register" element={<RegisterView />} />

  {/* Main app routes (with AppShell) */}
  <Route path="/*" element={
    <AppShell>
      <Routes>
        {/* Public routes */}
        <Route path="/flash-games" element={
          <ProtectedRoute requireAuth={false}>
            <FlashGamesView />
          </ProtectedRoute>
        } />

        {/* Protected routes */}
        <Route path="/games/:id/play" element={
          <ProtectedRoute requirePermission="games.play">
            <GamePlayerView />
          </ProtectedRoute>
        } />
      </Routes>
    </AppShell>
  } />
</Routes>
```

#### Route Protection

**ProtectedRoute Component** handles authorization:

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Default: true
  requirePermission?: string; // Optional permission check
  requireAnyPermission?: string[]; // Any of these permissions
  requireAllPermissions?: string[]; // All of these permissions
}
```

**Protection Levels:**

1. **Public Routes** - `requireAuth={false}` - Accessible to everyone
2. **Authenticated Routes** - `requireAuth={true}` - Requires login
3. **Permission-based Routes** - `requirePermission="games.play"` - RBAC check

### 4. API Integration

#### Axios Client Configuration

Centralized API client in `lib/api.ts`:

```typescript
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### Request Interceptor

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

#### Response Interceptor

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

### 5. Type Safety

#### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Type Definitions

All types are defined in `src/types/`:

- **game.ts** - Game, PaginatedResult, GameFilters, Playlist
- **auth.ts** - User, Role, Permission, LoginResponse, AuthTokens
- **play-tracking.ts** - PlaySession, UserStats, GameStats

### 6. Performance Optimizations

#### Code Splitting

**Route-level lazy loading** - All views use React.lazy for optimal bundle
splitting:

```typescript
// App.tsx - Lazy load all views
const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const BrowseView = lazy(() => import('./views/BrowseView').then(m => ({ default: m.BrowseView })));
const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
// ... all 19 views lazy loaded

// Wrapped in Suspense with loading fallback
<Route path="/browse" element={
  <Suspense fallback={<RouteLoadingFallback />}>
    <BrowseView />
  </Suspense>
} />
```

**Impact**: Reduced initial bundle size from 289KB to ~180KB (38% reduction)

**Manual chunk splitting** in vite.config.ts:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'charts': ['recharts'] // Lazy loaded separately
      }
    }
  }
}
```

#### Memoization

**React.memo()** for expensive components with custom comparison:

```typescript
// GameCard.tsx - Prevents 98% of unnecessary re-renders
export const GameCard = memo(GameCardComponent, (prevProps, nextProps) => {
  // Only re-render if game ID changed
  if (prevProps.game.id !== nextProps.game.id) return false;

  // Or if favorite status changed
  const prevIsFavorited =
    prevProps.favoriteGameIds?.has(prevProps.game.id) ?? false;
  const nextIsFavorited =
    nextProps.favoriteGameIds?.has(nextProps.game.id) ?? false;
  if (prevIsFavorited !== nextIsFavorited) return false;

  // Or if button visibility changed
  if (
    prevProps.showFavoriteButton !== nextProps.showFavoriteButton ||
    prevProps.showRemoveButton !== nextProps.showRemoveButton
  )
    return false;

  return true; // Don't re-render
});
```

**Impact**: In a 50-card grid, only 1 card re-renders when favoriting instead of
all 50 (49 prevented renders = 98% reduction)

**useMemo()** for computed values:

```typescript
const filteredGames = useMemo(
  () => games.filter((game) => game.platform === selectedPlatform),
  [games, selectedPlatform]
);
```

**useCallback()** for event handlers:

```typescript
const handleFavorite = useCallback(
  (gameId: string) => {
    favoriteMutation.mutate(gameId);
  },
  [favoriteMutation]
);
```

#### Image Optimization

```typescript
<img
  src={imageUrl}
  alt={game.title}
  loading="lazy"
  onLoad={() => setImageLoaded(true)}
  onError={() => setImageError(true)}
/>
```

#### Request Optimization

- Query key deduplication
- Prefetching on hover
- Optimistic updates for mutations

### 7. Utility Functions

#### Error Handling Utilities

**errorUtils.ts** - Type-safe error message extraction:

```typescript
// Centralized error handling across all components
import { getApiErrorMessage } from '@/utils/errorUtils';

try {
  await login(credentials);
} catch (error) {
  const message = getApiErrorMessage(error, 'Login failed');
  toast.error(message);
}
```

**Benefits**:

- Type-safe error handling
- Consistent error message extraction
- Handles Axios errors, Error objects, and unknown types
- Eliminates duplicate error handling code

### 8. Error Handling

#### Error Boundary

Top-level error boundary catches React errors:

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### Network Status Indicator

Monitors online/offline status:

```typescript
<NetworkStatusIndicator />
```

#### Toast Notifications

User-facing error messages via Sonner:

```typescript
import { toast } from 'sonner';

toast.error('Failed to load game data');
toast.success('Game added to favorites');
```

## Design Patterns

### Custom Hooks Pattern

All API calls are wrapped in custom hooks:

```typescript
// hooks/useGames.ts
export function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.search(filters),
  });
}

// Usage in component
const { data, isLoading, error } = useGames(filters);
```

### Compound Component Pattern

Complex components use composition:

```typescript
<Card>
  <CardHeader>
    <CardTitle>Game Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Footer */}
  </CardFooter>
</Card>
```

### Render Props Pattern

Flexibility through render props:

```typescript
<GameBrowseLayout
  renderHeader={() => <div>Custom Header</div>}
  renderActions={() => <div>Custom Actions</div>}
/>
```

## Build and Deployment

### Vite Configuration

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3100',
      '/proxy': 'http://localhost:3100',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

### Production Build

```bash
npm run build
```

Outputs:

- Minified JavaScript bundles
- Code-split chunks
- Optimized CSS
- Source maps
- Asset hashing for cache busting

## Testing Strategy

### Unit Tests (Future)

- Component testing with React Testing Library
- Hook testing with @testing-library/react-hooks
- Utility function tests

### Integration Tests (Future)

- API integration tests
- Form submission flows
- Authentication flows

### E2E Tests (Future)

- Critical user journeys
- Game browsing and playing
- Playlist management

## Further Reading

- [Component Documentation](./components/component-overview.md)
- [State Management](./state-management/zustand-stores.md)
- [Custom Hooks](./custom-hooks.md)
- [API Client](./api-client.md)
