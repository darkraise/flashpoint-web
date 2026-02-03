# Data Flow Diagrams

## 1. Game Browse and Search Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant BrowseView
    participant useGames Hook
    participant API Client
    participant Backend
    participant GameService
    participant FlashpointDB

    User->>Browser: Navigate to /browse
    Browser->>BrowseView: Render component
    BrowseView->>useGames Hook: Initialize with filters
    useGames Hook->>API Client: gamesApi.search(filters)

    API Client->>Backend: GET /api/games?page=1&limit=50&platform=Flash
    Backend->>GameService: searchGames(query)
    GameService->>FlashpointDB: SELECT * FROM game WHERE...
    FlashpointDB-->>GameService: Game rows
    GameService-->>Backend: PaginatedResult<Game>
    Backend-->>API Client: JSON response
    API Client->>useGames Hook: Update cache
    useGames Hook->>BrowseView: Trigger re-render
    BrowseView->>Browser: Display game grid

    User->>Browser: Select platform "HTML5"
    Browser->>BrowseView: Update filters state
    BrowseView->>useGames Hook: Refetch with new filters
    useGames Hook->>API Client: gamesApi.search(newFilters)
    API Client->>Backend: GET /api/games?platform=HTML5
    Backend-->>API Client: Filtered results
    API Client->>useGames Hook: Update cache
    useGames Hook->>BrowseView: Trigger re-render
    BrowseView->>Browser: Display filtered games
```

**Data Transformation**:
- Frontend state: `{ search: "mario", platform: "Flash", page: 1, limit: 50 }`
- URL params: `?search=mario&platform=Flash&page=1&limit=50`
- Backend validation: Zod schema validation
- SQL: `SELECT * FROM game WHERE platformName = 'Flash' AND title LIKE '%mario%' ... LIMIT 50 OFFSET 0`

## 2. Game Detail View Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant GameDetailView
    participant useGame Hook
    participant useRelated Hook
    participant API Client
    participant Backend
    participant FlashpointDB

    User->>Browser: Click on game card
    Browser->>GameDetailView: Navigate to /games/:id
    GameDetailView->>useGame Hook: useQuery(['game', id])
    GameDetailView->>useRelated Hook: useQuery(['related', id])

    par Parallel Requests
        useGame Hook->>API Client: gamesApi.getById(id)
        API Client->>Backend: GET /api/games/{id}
        Backend->>FlashpointDB: SELECT * FROM game
        FlashpointDB-->>Backend: Game row
        Backend-->>API Client: Game object
        API Client->>useGame Hook: Cache game data
    and
        useRelated Hook->>API Client: gamesApi.getRelated(id)
        API Client->>Backend: GET /api/games/{id}/related?limit=10
        Backend->>FlashpointDB: SELECT related by developer/platform
        FlashpointDB-->>Backend: Related games
        Backend-->>API Client: Game array
        API Client->>useRelated Hook: Cache related games
    end

    useGame Hook->>GameDetailView: Trigger render
    useRelated Hook->>GameDetailView: Trigger render
    GameDetailView->>Browser: Display game details
```

## 3. Filter Options Loading Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant FilterPanel
    participant useFilterOptions Hook
    participant API Client
    participant Backend
    participant FlashpointDB

    User->>Browser: Click "Filters" button
    Browser->>FilterPanel: Open filter panel
    FilterPanel->>useFilterOptions Hook: useQuery(['filterOptions'])

    Note over useFilterOptions Hook: Check cache first

    alt Cache Hit
        useFilterOptions Hook->>FilterPanel: Return cached data
    else Cache Miss
        useFilterOptions Hook->>API Client: gamesApi.getFilterOptions()
        API Client->>Backend: GET /api/games/filter-options
        Backend->>Backend: Parallel queries

        par All Filter Options
            Backend->>FlashpointDB: SELECT DISTINCT platformName, COUNT(*)
            FlashpointDB-->>Backend: Platforms
        and
            Backend->>FlashpointDB: SELECT DISTINCT developer, COUNT(*)
            FlashpointDB-->>Backend: Developers
        and
            Backend->>FlashpointDB: SELECT DISTINCT tag, COUNT(*)
            FlashpointDB-->>Backend: Tags
        and
            Backend->>FlashpointDB: SELECT MIN/MAX year
            FlashpointDB-->>Backend: Year range
        end

        Backend-->>API Client: FilterOptions object
        API Client->>useFilterOptions Hook: Cache with infinite staleTime
        useFilterOptions Hook->>FilterPanel: Render
    end

    FilterPanel->>Browser: Display filters
```

**Filter Options Response**:
```json
{
  "platforms": [
    { "name": "Flash", "count": 85000 },
    { "name": "HTML5", "count": 15000 }
  ],
  "developers": [
    { "name": "Developer A", "count": 500 }
  ],
  "tags": [
    { "name": "Action", "count": 15000 }
  ],
  "yearRange": { "min": 1995, "max": 2024 }
}
```

## 4. Image Loading Flow

```mermaid
sequenceDiagram
    participant Browser
    participant GameCard
    participant LazyImage
    participant Backend
    participant FileSystem

    Browser->>GameCard: Render component
    GameCard->>LazyImage: <img src="/api/images/logo/{gameId}" />

    Note over LazyImage: Uses Intersection Observer

    alt Image in viewport
        LazyImage->>Backend: GET /api/images/logo/{gameId}
        Backend->>FileSystem: fs.readFileSync(logoPath)

        alt File exists
            FileSystem-->>Backend: Image bytes
            Backend-->>LazyImage: Image with Cache-Control headers
            LazyImage->>Browser: Display image
        else File not found
            Backend-->>LazyImage: 404 Not Found
            LazyImage->>Browser: Display fallback
        end
    else Image not in viewport
        Note over LazyImage: Wait for scroll
    end
```

## 5. Pagination Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant BrowseView
    participant Pagination
    participant useGames Hook
    participant API Client
    participant Backend

    User->>Browser: Click "Next Page"
    Browser->>Pagination: onClick handler
    Pagination->>BrowseView: Update page state
    BrowseView->>BrowseView: Update URL: ?page=2
    BrowseView->>useGames Hook: Filters changed (page=2)

    alt Page 2 in cache
        useGames Hook->>BrowseView: Return cached page 2
    else Page 2 not cached
        useGames Hook->>API Client: gamesApi.search({...filters, page: 2})
        API Client->>Backend: GET /api/games?page=2&limit=50
        Backend->>Backend: Calculate offset: (2-1) * 50 = 50
        Backend-->>API Client: Page 2 data
        API Client->>useGames Hook: Cache page 2
        useGames Hook->>BrowseView: Trigger render
    end

    BrowseView->>Browser: Display games
    Browser->>User: Show page 2
```

## 6. Real-time Search Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant SearchBar
    participant Debouncer
    participant BrowseView
    participant useGames Hook
    participant API Client
    participant Backend

    User->>Browser: Type "m"
    Browser->>SearchBar: onChange event
    SearchBar->>Debouncer: Schedule update (300ms)

    User->>Browser: Type "a"
    Browser->>SearchBar: onChange event
    SearchBar->>Debouncer: Cancel previous, schedule new (300ms)

    User->>Browser: Type "r"
    Browser->>SearchBar: onChange event
    SearchBar->>Debouncer: Cancel previous, schedule new (300ms)

    Note over Debouncer: 300ms elapsed

    Debouncer->>BrowseView: Update filters: {search: "mar"}
    BrowseView->>useGames Hook: Refetch with search
    useGames Hook->>API Client: gamesApi.search({search: "mar"})
    API Client->>Backend: GET /api/games?search=mar
    Backend-->>API Client: Filtered results
    API Client->>useGames Hook: Update cache
    useGames Hook->>BrowseView: Trigger render
    BrowseView->>Browser: Display search results
```

**Debounce Implementation**:
```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    onSearch(value);
  }, 300),
  [onSearch]
);

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setSearchValue(value);        // Immediate UI update
  debouncedSearch(value);       // Debounced API call
};
```

## 7. Multi-Select Filter Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant FilterPanel
    participant BrowseView
    participant API Client
    participant Backend

    User->>Browser: Check "Flash" checkbox
    Browser->>FilterPanel: Update selected: ["Flash"]
    FilterPanel->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?platform=Flash
    API Client->>Backend: Request with single platform
    Backend-->>Browser: Show Flash games

    User->>Browser: Check "HTML5" checkbox
    Browser->>FilterPanel: Update selected: ["Flash", "HTML5"]
    FilterPanel->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?platform=Flash,HTML5
    API Client->>Backend: Request with comma-separated platforms
    Backend-->>Browser: Show Flash OR HTML5 games
```

**Multi-Select SQL**:
```typescript
// Frontend: Array to string
const platformParam = selectedPlatforms.join(',');  // "Flash,HTML5"

// Backend: Parse back
const platforms = query.platform?.split(',').filter(Boolean);  // ["Flash", "HTML5"]

// SQL: Dynamic placeholders
if (platforms?.length > 0) {
  const placeholders = platforms.map(() => '?').join(', ');
  sql += ` AND g.platformName IN (${placeholders})`;
  params.push(...platforms);
}
```

## 8. Sort Order Change Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant SortControl
    participant BrowseView
    participant API Client
    participant Backend

    User->>Browser: Click "Release Date" sort
    Browser->>SortControl: Update sortBy
    SortControl->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?sortBy=releaseDate&sortOrder=asc
    API Client->>Backend: Request with new sort
    Backend-->>Browser: Games sorted by release date

    User->>Browser: Click "Release Date" again (toggle)
    Browser->>SortControl: Toggle sortOrder
    SortControl->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?sortBy=releaseDate&sortOrder=desc
    API Client->>Backend: Request with reversed order
    Backend-->>Browser: Newest games first
```

## 9. Cache Management

```mermaid
graph TB
    UserAction[User Action]
    CheckCache{Cache exists?}
    CheckStale{Is stale?}
    ReturnCache[Return from cache]
    FetchBackground[Fetch in background]
    FetchForeground[Fetch immediately]
    UpdateCache[Update cache]
    RenderUI[Render UI]

    UserAction --> CheckCache
    CheckCache -->|Yes| CheckStale
    CheckCache -->|No| FetchForeground

    CheckStale -->|No| ReturnCache
    CheckStale -->|Yes| FetchBackground
    ReturnCache --> RenderUI
    ReturnCache -.-> FetchBackground

    FetchBackground --> UpdateCache
    FetchForeground --> UpdateCache
    UpdateCache --> RenderUI

    style ReturnCache fill:#90ee90
    style FetchForeground fill:#ffcccb
    style FetchBackground fill:#ffd700
```

**Stale-While-Revalidate**:
```typescript
useQuery({
  queryKey: ['games', filters],
  queryFn: () => gamesApi.search(filters),
  staleTime: 5 * 60 * 1000,         // 5 min - fresh
  cacheTime: 10 * 60 * 1000,        // 10 min - in memory
  refetchOnWindowFocus: true,       // Refresh on tab focus
  keepPreviousData: true            // Show old while fetching new
});
```

## Key Patterns

1. **Layered Architecture**: UI → API → Service → Database
2. **Smart Caching**: TanStack Query provides automatic cache management
3. **Optimistic Updates**: UI updates immediately with rollback on error
4. **Parallel Requests**: Multiple queries execute concurrently
5. **Debouncing**: User input debounced to reduce requests
6. **State Synchronization**: URL state, local state, and server state in sync
