# URL State Management

Documentation for managing filter and pagination state in URL search params.

## Overview

The application uses URL search parameters (query strings) to manage:
- Filters (platform, tags, search, etc.)
- Pagination (page, limit)
- Sort options

**Benefits:**
- Shareable URLs
- Browser back/forward support
- Bookmark-able search results
- No client-side state management needed

## Usage Pattern

```typescript
import { useSearchParams } from 'react-router-dom';

function BrowseView() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read from URL
  const platform = searchParams.get('platform') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  // Update URL
  const updateFilters = (newFilters: Partial<GameFilters>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    setSearchParams(params);
  };

  return (
    <div>
      <FilterPanel
        filters={{ platform, page, search }}
        onFiltersChange={updateFilters}
      />
      <GameGrid filters={{ platform, page, search }} />
    </div>
  );
}
```

## Filter Synchronization

Filters in URL sync with TanStack Query:

```typescript
// URL params automatically trigger new query
const { data, isLoading } = useGames({
  platform: searchParams.get('platform'),
  search: searchParams.get('search'),
  page: parseInt(searchParams.get('page') || '1')
});
```

## URL Structure

### Browse View

```
/browse?platform=Flash&search=mario&page=2&limit=50&sort=title
```

Parameters:
- `platform` - Filter by platform (Flash, HTML5, etc.)
- `search` - Search query
- `page` - Current page number
- `limit` - Items per page
- `sort` - Sort field (title, releaseDate, etc.)
- `order` - Sort order (asc, desc)
- `tags` - Comma-separated tag IDs
- `playMode` - Single Player, Multiplayer, etc.
- `library` - arcade, theatre, etc.

### Example URLs

```
# Flash games, page 2
/browse?platform=Flash&page=2

# Search for "mario"
/browse?search=mario

# Multiple filters
/browse?platform=HTML5&playMode=Single%20Player&sort=releaseDate&order=desc
```

## Helper Functions

### Build Filter Object from URL

```typescript
function getFiltersFromURL(searchParams: URLSearchParams): GameFilters {
  return {
    platform: searchParams.get('platform') || undefined,
    search: searchParams.get('search') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    sort: searchParams.get('sort') || undefined,
    order: searchParams.get('order') || undefined,
    tags: searchParams.get('tags')?.split(',') || undefined,
    playMode: searchParams.get('playMode') || undefined,
    library: searchParams.get('library') || undefined
  };
}
```

### Update Single Filter

```typescript
function updateFilter(key: string, value: string | number) {
  const params = new URLSearchParams(searchParams);

  if (value && value !== 'all') {
    params.set(key, String(value));
  } else {
    params.delete(key);
  }

  // Reset to page 1 when filters change
  if (key !== 'page') {
    params.set('page', '1');
  }

  setSearchParams(params);
}
```

### Clear All Filters

```typescript
function clearFilters() {
  setSearchParams({});
}
```

## Pagination with URL State

```typescript
function Pagination({ total, page, limit }: PaginationProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  return (
    <div>
      <button onClick={() => goToPage(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>Page {page}</span>
      <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  );
}
```

## Benefits

### Shareable Links

Users can share exact search results:
```
https://flashpoint.app/browse?platform=Flash&search=pokemon&sort=title
```

### Browser Navigation

Back/forward buttons work naturally:
- Back: Previous filter state
- Forward: Next filter state

### Bookmarkable

Users can bookmark specific searches and return to exact state.

## Caveats

### URL Length Limits

Be cautious with very long filter combinations. Consider:
- Limiting number of tags
- Using shortened parameter names
- Storing complex filters server-side

### Type Coercion

URL params are always strings:

```typescript
// Parse numbers
const page = parseInt(searchParams.get('page') || '1');

// Parse booleans
const includeAnimations = searchParams.get('includeAnimations') === 'true';

// Parse arrays
const tags = searchParams.get('tags')?.split(',') || [];
```

## Further Reading

- [React Router Documentation](https://reactrouter.com/en/main/hooks/use-search-params)
- [Zustand Stores](./zustand-stores.md)
- [React Query](./react-query.md)
