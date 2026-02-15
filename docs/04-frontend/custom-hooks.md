# Custom Hooks

Comprehensive documentation of all custom React hooks in the Flashpoint Web
frontend.

## Overview

The application uses 30 custom hooks organized by functionality:

- **Data Fetching** - useGames, usePlaylists, useUserPlaylists, useUsers,
  useRoles, useActivities, useFavorites
- **Authentication** - useAuth, usePublicSettings
- **UI** - useDebounce, useSwipeGesture, useMountEffect, useToast,
  useDateTimeFormat, useMediaQuery, useFeatureFlags
- **Game Data** - useFilterOptions, useFilterDropdowns, useTags, usePlatforms,
  useStatistics, useDownload, useMostPlayedGames, useRecentGames
- **Play Tracking** - usePlayTracking, useActivityFilters
- **Community** - useCommunityPlaylists
- **Shared Access** - useSharedAccessToken, useSharedPlaylistAccess, useDomains

## Data Fetching Hooks

### useGames

Game search and retrieval hooks.

**Location:** `frontend/src/hooks/useGames.ts`

```typescript
// Search games with filters
const { data, isLoading, error } = useGames(filters: GameFilters);

// Get single game by ID
const { data: game } = useGame(id: string);

// Get related games
const { data: related } = useRelatedGames(id: string, limit = 10);

// Get random game
const { data: random } = useRandomGame(library?: string);

// Get launch data for playing
const { data: launchData } = useGameLaunchData(id: string);
```

**Example:**

```typescript
function BrowseView() {
  const [filters, setFilters] = useState<GameFilters>({
    platform: 'Flash',
    search: '',
    page: 1,
    limit: 50
  });

  const { data, isLoading, error } = useGames(filters);

  if (isLoading) return <GameGridSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <GameGrid games={data.games} total={data.total} />;
}
```

### usePlaylists

Playlist management hooks.

**Location:** `frontend/src/hooks/usePlaylists.ts`

```typescript
const { data: playlists } = usePlaylists();
const { data: playlist } = usePlaylist(id: string);
const createMutation = useCreatePlaylist();
const addGamesMutation = useAddGamesToPlaylist();
const removeGamesMutation = useRemoveGamesFromPlaylist();
const deleteMutation = useDeletePlaylist();
```

### useDomains

Domain management hooks for admin domain settings.

**Location:** `frontend/src/hooks/useDomains.ts`

```typescript
// Fetch all domains (admin only)
const { data: domains } = useDomains(enabled?: boolean);

// Mutations
const addDomain = useAddDomain();       // addDomain.mutate('play.example.com')
const deleteDomain = useDeleteDomain(); // deleteDomain.mutate(domainId)
const setDefault = useSetDefaultDomain(); // setDefault.mutate(domainId) - optimistic update

// Utility: build share URL from hostname + token
import { buildShareUrl } from '@/hooks/useDomains';
const url = buildShareUrl('play.example.com', shareToken);
// => "https://play.example.com/playlists/shared/{token}"
const fallback = buildShareUrl(null, shareToken);
// => "{window.location.origin}/playlists/shared/{token}"
```

All mutations automatically invalidate the `['system-settings', 'public']` cache
so the default domain updates across the app.

## Authentication Hook

### useAuth

Authentication context hook with login/logout functions.

**Location:** `frontend/src/hooks/useAuth.ts`

```typescript
const { login, logout, register } = useAuth();

// Login
await login({ username: 'user', password: 'pass' });

// Register
await register({
  username: 'newuser',
  email: 'email@example.com',
  password: 'pass',
});

// Logout
await logout();
```

## Utility Hooks

### useDebounce

Debounce value changes for search inputs.

```typescript
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);

useEffect(() => {
  // Only triggers 500ms after user stops typing
  fetchGames({ search: debouncedSearch });
}, [debouncedSearch]);
```

### useMountEffect

Run effect only on component mount.

```typescript
useMountEffect(() => {
  console.log('Component mounted');
  fetchInitialData();
});
```

### useSwipeGesture

Detect swipe gestures for mobile.

```typescript
const ref = useSwipeGesture<HTMLDivElement>({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
  minSwipeDistance: 50
});

return <div ref={ref}>Swipeable content</div>;
```

### useDateTimeFormat

Date and time formatting hook with user-configurable formats.

**Location:** `frontend/src/hooks/useDateTimeFormat.ts`

**Purpose:** Provides consistent date/time formatting across the application
using user-selected format preferences from system settings.

```typescript
const {
  dateFormat, // Current date format string (e.g., 'MM/dd/yyyy')
  timeFormat, // Current time format string (e.g., 'hh:mm a')
  formatDate, // Function to format dates
  formatTime, // Function to format times
  formatDateTime, // Function to format date + time
} = useDateTimeFormat();
```

**Available Date Formats:**

- `MM/dd/yyyy` - US format (01/24/2026)
- `dd/MM/yyyy` - European format (24/01/2026)
- `yyyy-MM-dd` - ISO 8601 format (2026-01-24)
- `MMM dd, yyyy` - Short month (Jan 24, 2026)
- `MMMM dd, yyyy` - Full month (January 24, 2026)
- `dd MMM yyyy` - Day-first short month (24 Jan 2026)
- `dd MMMM yyyy` - Day-first full month (24 January 2026)

**Available Time Formats:**

- `hh:mm a` - 12-hour with AM/PM (02:30 PM)
- `HH:mm` - 24-hour (14:30)
- `hh:mm:ss a` - 12-hour with seconds (02:30:45 PM)
- `HH:mm:ss` - 24-hour with seconds (14:30:45)

**Example Usage:**

```typescript
function ActivityTable() {
  const { formatDateTime } = useDateTimeFormat();

  return (
    <Table>
      {activities.map(activity => (
        <TableRow key={activity.id}>
          <TableCell>{formatDateTime(activity.createdAt)}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

**With FormattedDate Component:**

```typescript
import { FormattedDate } from '@/components/common/FormattedDate';

function GameStats() {
  return (
    <div>
      <p>First played: <FormattedDate date={stats.firstPlayAt} type="date" /></p>
      <p>Last played: <FormattedDate date={stats.lastPlayAt} type="datetime" /></p>
    </div>
  );
}
```

**Features:**

- Automatically fetches user's format preferences from system settings
- Caches settings with 5-minute staleTime
- Handles Date objects, ISO strings, and timestamps
- Falls back to defaults if settings not loaded
- Uses date-fns for reliable formatting

**See Also:**
[Date & Time Formatting Feature](../../10-features/10-date-time-formatting.md)

### useFilterOptions

Fetch available filter options (platforms, tags, etc.).

```typescript
const { data: options, isLoading } = useFilterOptions();

// options = { platforms: [...], tags: [...], playModes: [...] }
```

## Play Tracking Hook

### usePlayTracking

Track game play sessions.

```typescript
const { startSession, endSession, isPlaying } = usePlayTracking();

// Start playing
await startSession(gameId, gameTitle);

// End playing
await endSession();
```

## Query Configuration

All hooks use TanStack Query with these defaults:

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

## Further Reading

- [TanStack Query Documentation](./state-management/react-query.md)
- [API Client](./api-client.md)
