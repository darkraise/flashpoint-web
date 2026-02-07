# TanStack Query (React Query)

Documentation for server state management using TanStack Query v5.

## Overview

TanStack Query handles all server-side data (games, playlists, users) with
automatic caching, background refetching, and request deduplication.

**Version:** 5.62.7

## Configuration

Global query client configuration in `main.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      cacheTime: 10 * 60 * 1000,      // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

## Custom Hooks Pattern

All API calls are wrapped in custom hooks:

```typescript
// hooks/useGames.ts
import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';

export function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.search(filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

## Query Keys

Query keys determine caching and invalidation:

```typescript
// Simple key
queryKey: ['games'];

// With parameters
queryKey: ['games', filters];

// Nested resources
queryKey: ['game', gameId, 'related'];

// Complex keys
queryKey: ['users', { page, limit, search }];
```

## Mutations

For data modifications (create, update, delete):

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlist) => playlistsApi.create(playlist),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist created');
    },
    onError: (error) => {
      toast.error('Failed to create playlist');
    },
  });
}
```

## Optimistic Updates

Update UI immediately before server response:

```typescript
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId) => favoritesApi.toggle(gameId),
    onMutate: async (gameId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(['favorites']);

      // Optimistically update
      queryClient.setQueryData(['favorites'], (old) => {
        // Update logic here
      });

      return { previousFavorites };
    },
    onError: (err, gameId, context) => {
      // Rollback on error
      queryClient.setQueryData(['favorites'], context.previousFavorites);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
```

## Stale Time Strategy

Different data has different stale times:

- **Games:** 5 minutes (rarely change)
- **User data:** 1 minute (may change frequently)
- **Statistics:** 30 seconds (real-time updates)

```typescript
// Long stale time for stable data
useQuery({
  queryKey: ['games', id],
  queryFn: () => gamesApi.getById(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Short stale time for dynamic data
useQuery({
  queryKey: ['stats'],
  queryFn: () => statsApi.get(),
  staleTime: 30 * 1000, // 30 seconds
});
```

## Enabled Queries

Conditional query execution:

```typescript
useQuery({
  queryKey: ['game', id],
  queryFn: () => gamesApi.getById(id),
  enabled: !!id, // Only run if id exists
});
```

## Conditional Refetch Intervals

Poll with dynamic intervals based on data state:

```typescript
// Example: Poll for game download completion
useQuery({
  queryKey: ['game', id, 'launch'],
  queryFn: () => gamesApi.getGameLaunchData(id),
  // Poll every 2 seconds if downloading, stop when done
  refetchInterval: (query) => query.state.data?.downloading ? 2000 : false,
});

// This replaces manual polling logic with declarative TanStack Query patterns
```

**Use Cases:**
- Download progress polling (poll while `downloading: true`)
- Live status updates (poll while in progress, stop when complete)
- Real-time data that becomes stale at specific times
- User activity tracking

**Benefits:**
- Automatic cleanup when condition becomes false
- Respects query cache and stale time
- Deduplicates requests via query client
- Integrates with DevTools

## Infinite Queries

For pagination:

```typescript
useInfiniteQuery({
  queryKey: ['games', filters],
  queryFn: ({ pageParam = 1 }) =>
    gamesApi.search({ ...filters, page: pageParam }),
  getNextPageParam: (lastPage) => {
    return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
  },
});
```

## DevTools

Enable React Query DevTools for debugging:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

## Further Reading

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Custom Hooks](../custom-hooks.md)
- [API Client](../api-client.md)
