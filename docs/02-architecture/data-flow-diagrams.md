# Data Flow Diagrams

## Overview

This document provides detailed data flow diagrams for key user journeys and system operations in Flashpoint Web. Each diagram illustrates the complete flow of data from user interaction through all system layers to the database and back.

## 1. Game Browse and Search Flow

### User Story
As a user, I want to browse and search for games with filters so I can find games I'm interested in.

### Sequence Diagram

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

    Note over API Client: Add JWT token via interceptor

    API Client->>Backend: GET /api/games?page=1&limit=50&platform=Flash
    Backend->>Backend: Validate query params (Zod)
    Backend->>GameService: searchGames(query)
    GameService->>FlashpointDB: SELECT * FROM game WHERE...
    FlashpointDB-->>GameService: Game rows
    GameService->>GameService: Apply pagination
    GameService-->>Backend: PaginatedResult<Game>
    Backend-->>API Client: JSON response
    API Client->>useGames Hook: Update cache
    useGames Hook->>BrowseView: Trigger re-render
    BrowseView->>Browser: Display game grid
    Browser->>User: Show games

    Note over User: User changes filter

    User->>Browser: Select platform "HTML5"
    Browser->>BrowseView: Update filters state
    BrowseView->>useGames Hook: Refetch with new filters
    useGames Hook->>API Client: gamesApi.search(newFilters)
    API Client->>Backend: GET /api/games?platform=HTML5
    Backend->>GameService: searchGames(query)
    GameService->>FlashpointDB: SELECT * FROM game WHERE platformName = 'HTML5'
    FlashpointDB-->>GameService: Filtered rows
    GameService-->>Backend: PaginatedResult<Game>
    Backend-->>API Client: JSON response
    API Client->>useGames Hook: Update cache with new data
    useGames Hook->>BrowseView: Trigger re-render
    BrowseView->>Browser: Display filtered games
    Browser->>User: Show HTML5 games only
```

### Data Transformation

**1. User Input → Query Parameters**:
```typescript
// Frontend state
{
  search: "mario",
  platform: "Flash",
  yearFrom: 2000,
  yearTo: 2010,
  page: 1,
  limit: 50
}

// Transformed to URL params
?search=mario&platform=Flash&yearFrom=2000&yearTo=2010&page=1&limit=50
```

**2. Backend Validation**:
```typescript
const searchQuerySchema = z.object({
  search: z.string().optional(),
  platform: z.string().optional(),
  yearFrom: z.coerce.number().int().min(1970).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1970).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});
```

**3. SQL Query Construction**:
```sql
SELECT
  g.id, g.title, g.developer, g.publisher,
  g.platformName, g.releaseDate, g.logoPath
FROM game g
WHERE 1=1
  AND g.platformName = 'Flash'
  AND g.title LIKE '%mario%'
  AND CAST(SUBSTR(g.releaseDate, 1, 4) AS INTEGER) BETWEEN 2000 AND 2010
  AND (g.broken = 0 OR g.broken IS NULL)
ORDER BY g.orderTitle ASC
LIMIT 50 OFFSET 0
```

**4. Response Transformation**:
```typescript
// Database row
{
  id: 'abc-123',
  title: 'Super Mario Flash',
  developer: 'Developer Name',
  platformName: 'Flash',
  logoPath: 'abc-123.png',
  ...
}

// API Response
{
  data: [{ game objects }],
  total: 1234,
  page: 1,
  limit: 50,
  totalPages: 25
}
```

## 2. Game Detail View Flow

### User Story
As a user, I want to view detailed information about a game including screenshots, metadata, and related games.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant GameDetailView
    participant useGame Hook
    participant useRelated Hook
    participant API Client
    participant Backend
    participant GameService
    participant FlashpointDB

    User->>Browser: Click on game card
    Browser->>GameDetailView: Navigate to /games/:id
    GameDetailView->>useGame Hook: useQuery(['game', id])
    GameDetailView->>useRelated Hook: useQuery(['related', id])

    par Parallel Requests
        useGame Hook->>API Client: gamesApi.getById(id)
        API Client->>Backend: GET /api/games/{id}
        Backend->>GameService: getGameById(id)
        GameService->>FlashpointDB: SELECT * FROM game WHERE id = ?
        FlashpointDB-->>GameService: Game row
        GameService-->>Backend: Game object
        Backend-->>API Client: JSON response
        API Client->>useGame Hook: Cache game data
    and
        useRelated Hook->>API Client: gamesApi.getRelated(id)
        API Client->>Backend: GET /api/games/{id}/related?limit=10
        Backend->>GameService: getRelatedGames(id, 10)
        GameService->>FlashpointDB: SELECT source game
        FlashpointDB-->>GameService: Source game
        GameService->>FlashpointDB: SELECT related by developer/platform
        FlashpointDB-->>GameService: Related games
        GameService-->>Backend: Game[] array
        Backend-->>API Client: JSON response
        API Client->>useRelated Hook: Cache related games
    end

    useGame Hook->>GameDetailView: Trigger render
    useRelated Hook->>GameDetailView: Trigger render
    GameDetailView->>Browser: Display game details
    Browser->>User: Show game information
```

### Related Games Query Logic

```sql
-- 1. Get source game
SELECT * FROM game WHERE id = 'source-id';

-- 2. Find related games with priority scoring
SELECT
  g.id, g.title, g.developer, g.platformName,
  g.logoPath, g.screenshotPath
FROM game g
WHERE g.id != 'source-id'
  AND (
    g.developer = 'Source Developer' OR
    g.platformName = 'Source Platform'
  )
ORDER BY
  CASE
    WHEN g.developer = 'Source Developer' THEN 1
    WHEN g.platformName = 'Source Platform' THEN 2
    ELSE 3
  END,
  RANDOM()
LIMIT 10
```

## 3. Filter Options Loading Flow

### User Story
As a user, when I open the filter panel, I want to see all available filter options with counts.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant FilterPanel
    participant useFilterOptions Hook
    participant API Client
    participant Backend
    participant GameService
    participant FlashpointDB

    User->>Browser: Click "Filters" button
    Browser->>FilterPanel: Open filter panel
    FilterPanel->>useFilterOptions Hook: useQuery(['filterOptions'])

    Note over useFilterOptions Hook: Check cache first

    alt Cache Hit
        useFilterOptions Hook->>FilterPanel: Return cached data
        FilterPanel->>Browser: Display filters
    else Cache Miss
        useFilterOptions Hook->>API Client: gamesApi.getFilterOptions()
        API Client->>Backend: GET /api/games/filter-options
        Backend->>GameService: getFilterOptions()

        Note over GameService: Parallel queries for all options

        par Fetch All Filter Options
            GameService->>FlashpointDB: SELECT DISTINCT platformName, COUNT(*)
            FlashpointDB-->>GameService: Platforms
        and
            GameService->>FlashpointDB: SELECT DISTINCT developer, COUNT(*)
            FlashpointDB-->>GameService: Developers
        and
            GameService->>FlashpointDB: SELECT DISTINCT publisher, COUNT(*)
            FlashpointDB-->>GameService: Publishers
        and
            GameService->>FlashpointDB: SELECT DISTINCT series, COUNT(*)
            FlashpointDB-->>GameService: Series
        and
            GameService->>FlashpointDB: SELECT DISTINCT playMode, COUNT(*)
            FlashpointDB-->>GameService: Play Modes
        and
            GameService->>FlashpointDB: SELECT DISTINCT language, COUNT(*)
            FlashpointDB-->>GameService: Languages
        and
            GameService->>FlashpointDB: SELECT DISTINCT tagsStr
            FlashpointDB-->>GameService: Tags (pipe-delimited)
            GameService->>GameService: Parse and count tags
        and
            GameService->>FlashpointDB: SELECT MIN/MAX year from releaseDate
            FlashpointDB-->>GameService: Year range
        end

        GameService->>GameService: Combine all filter options
        GameService-->>Backend: FilterOptions object
        Backend-->>API Client: JSON response
        API Client->>useFilterOptions Hook: Cache with infinite staleTime
        useFilterOptions Hook->>FilterPanel: Trigger render
        FilterPanel->>Browser: Display all filter options
    end

    Browser->>User: Show populated filters
```

### Filter Options Response Structure

```typescript
{
  platforms: [
    { name: "Flash", count: 85000 },
    { name: "HTML5", count: 15000 },
    { name: "Shockwave", count: 5000 }
  ],
  developers: [
    { name: "Developer A", count: 500 },
    { name: "Developer B", count: 300 }
  ],
  publishers: [
    { name: "Publisher A", count: 1000 },
    { name: "Publisher B", count: 800 }
  ],
  series: [
    { name: "Series A", count: 50 },
    { name: "Series B", count: 30 }
  ],
  playModes: [
    { name: "Single Player", count: 80000 },
    { name: "Multiplayer", count: 20000 }
  ],
  languages: [
    { name: "en", count: 90000 },
    { name: "es", count: 5000 }
  ],
  tags: [
    { name: "Action", count: 15000 },
    { name: "Puzzle", count: 10000 }
  ],
  yearRange: {
    min: 1995,
    max: 2024
  }
}
```

## 4. Image Loading Flow

### User Story
As a user, I want to see game logos and screenshots that load efficiently.

### Sequence Diagram

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
        Backend->>Backend: Resolve path: FLASHPOINT_LOGOS_PATH/{gameId}.png
        Backend->>FileSystem: fs.readFileSync(logoPath)

        alt File exists
            FileSystem-->>Backend: Image bytes
            Backend-->>LazyImage: Image with headers
            Note over Backend: Content-Type: image/png<br/>Cache-Control: max-age=31536000
            LazyImage->>Browser: Display image
        else File not found
            Backend-->>LazyImage: 404 Not Found
            LazyImage->>Browser: Display fallback
        end
    else Image not in viewport
        Note over LazyImage: Wait for scroll
    end
```

### Image URL Construction

**Logo**:
```typescript
// Frontend
const logoUrl = `/api/images/logo/${game.id}`;

// Backend route
router.get('/images/logo/:gameId', (req, res) => {
  const imagePath = path.join(
    process.env.FLASHPOINT_LOGOS_PATH,
    `${req.params.gameId}.png`
  );
  res.sendFile(imagePath);
});
```

**Screenshot**:
```typescript
// Frontend
const screenshotUrl = `/api/images/screenshot/${game.id}`;

// Backend route
router.get('/images/screenshot/:gameId', (req, res) => {
  const imagePath = path.join(
    process.env.FLASHPOINT_IMAGES_PATH,
    `${req.params.gameId}.png`
  );
  res.sendFile(imagePath);
});
```

## 5. Pagination Flow

### User Story
As a user, I want to navigate through pages of search results efficiently.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant BrowseView
    participant Pagination
    participant useGames Hook
    participant API Client
    participant Backend

    Note over BrowseView: Currently on page 1

    User->>Browser: Click "Next Page"
    Browser->>Pagination: onClick handler
    Pagination->>BrowseView: Update page state
    BrowseView->>BrowseView: Update URL: ?page=2
    BrowseView->>useGames Hook: Filters changed (page=2)

    Note over useGames Hook: Check if page 2 is cached

    alt Page 2 in cache
        useGames Hook->>BrowseView: Return cached page 2
        BrowseView->>Browser: Display games
    else Page 2 not in cache
        useGames Hook->>useGames Hook: Show loading skeleton
        useGames Hook->>API Client: gamesApi.search({...filters, page: 2})
        API Client->>Backend: GET /api/games?page=2&limit=50
        Backend->>Backend: Calculate offset: (2-1) * 50 = 50
        Backend->>Backend: Execute query with LIMIT 50 OFFSET 50
        Backend-->>API Client: Page 2 data
        API Client->>useGames Hook: Cache page 2
        useGames Hook->>BrowseView: Trigger render
        BrowseView->>Browser: Display page 2 games
    end

    Browser->>User: Show page 2

    Note over User: User clicks page 1 again

    User->>Browser: Click "Page 1"
    Browser->>Pagination: onClick handler
    Pagination->>BrowseView: Update page state
    BrowseView->>useGames Hook: Filters changed (page=1)
    useGames Hook->>BrowseView: Return from cache (instant)
    BrowseView->>Browser: Display page 1
    Browser->>User: Instant navigation
```

### Pagination State Management

```typescript
// URL state (source of truth)
const [searchParams, setSearchParams] = useSearchParams();
const currentPage = parseInt(searchParams.get('page') || '1');

// Update page
const handlePageChange = (newPage: number) => {
  setSearchParams({ ...Object.fromEntries(searchParams), page: newPage.toString() });
};

// Query key includes page for automatic caching
const queryKey = ['games', { ...filters, page: currentPage }];
```

## 6. Real-time Search Flow

### User Story
As a user, I want search results to update as I type, with debouncing to avoid excessive requests.

### Sequence Diagram

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

    Note over Debouncer: Waiting...

    User->>Browser: Type "a"
    Browser->>SearchBar: onChange event
    SearchBar->>Debouncer: Cancel previous, schedule new (300ms)

    Note over Debouncer: Waiting...

    User->>Browser: Type "r"
    Browser->>SearchBar: onChange event
    SearchBar->>Debouncer: Cancel previous, schedule new (300ms)

    Note over Debouncer: Waiting...

    User->>Browser: Type "i"
    Browser->>SearchBar: onChange event
    SearchBar->>Debouncer: Cancel previous, schedule new (300ms)

    Note over Debouncer: 300ms elapsed

    Debouncer->>BrowseView: Update filters: {search: "mari"}
    BrowseView->>BrowseView: Update URL: ?search=mari
    BrowseView->>useGames Hook: Refetch with search
    useGames Hook->>API Client: gamesApi.search({search: "mari"})
    API Client->>Backend: GET /api/games?search=mari
    Backend->>Backend: Build LIKE query: WHERE title LIKE '%mari%'
    Backend-->>API Client: Filtered results
    API Client->>useGames Hook: Update cache
    useGames Hook->>BrowseView: Trigger render
    BrowseView->>Browser: Display search results
    Browser->>User: Show games matching "mari"
```

### Debounce Implementation

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash';

const SearchBar = ({ onSearch }) => {
  const [searchValue, setSearchValue] = useState('');

  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      onSearch(value);
    }, 300),
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value); // Immediate UI update
    debouncedSearch(value); // Debounced API call
  };

  return (
    <input
      type="text"
      value={searchValue}
      onChange={handleChange}
      placeholder="Search games..."
    />
  );
};
```

## 7. Multi-Select Filter Flow

### User Story
As a user, I want to select multiple platforms/developers to see games matching any of them (OR logic).

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant FilterPanel
    participant BrowseView
    participant API Client
    participant Backend
    participant GameService

    User->>Browser: Check "Flash" checkbox
    Browser->>FilterPanel: Update selected: ["Flash"]
    FilterPanel->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?platform=Flash
    API Client->>Backend: Request with single platform
    Backend->>GameService: searchGames({platforms: ["Flash"]})
    GameService->>GameService: Build SQL: platformName IN ('Flash')
    GameService-->>Backend: Results
    Backend-->>Browser: Show Flash games

    User->>Browser: Check "HTML5" checkbox
    Browser->>FilterPanel: Update selected: ["Flash", "HTML5"]
    FilterPanel->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?platform=Flash,HTML5
    API Client->>Backend: Request with comma-separated platforms
    Backend->>Backend: Parse: platform.split(',') → ["Flash", "HTML5"]
    Backend->>GameService: searchGames({platforms: ["Flash", "HTML5"]})
    GameService->>GameService: Build SQL: platformName IN ('Flash', 'HTML5')
    GameService-->>Backend: Combined results
    Backend-->>Browser: Show Flash OR HTML5 games

    User->>Browser: Uncheck "Flash" checkbox
    Browser->>FilterPanel: Update selected: ["HTML5"]
    FilterPanel->>BrowseView: Update filters
    BrowseView->>API Client: GET /api/games?platform=HTML5
    API Client->>Backend: Request with single platform
    Backend-->>Browser: Show HTML5 games only
```

### Multi-Select SQL Generation

```typescript
// Frontend: Array to comma-separated string
const platformParam = selectedPlatforms.join(',');
// "Flash,HTML5"

// Backend: Parse back to array
const platforms = query.platform?.split(',').filter(Boolean);
// ["Flash", "HTML5"]

// SQL: Dynamic placeholders
if (platforms && platforms.length > 0) {
  const placeholders = platforms.map(() => '?').join(', ');
  sql += ` AND g.platformName IN (${placeholders})`;
  params.push(...platforms);
}

// Generated SQL:
// WHERE platformName IN (?, ?)
// Params: ["Flash", "HTML5"]
```

## 8. Sort Order Change Flow

### User Story
As a user, I want to sort games by title, release date, or date added in ascending or descending order.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant SortControl
    participant BrowseView
    participant API Client
    participant Backend
    participant GameService

    Note over BrowseView: Current: sortBy=title, sortOrder=asc

    User->>Browser: Click "Release Date" sort
    Browser->>SortControl: Update sortBy
    SortControl->>BrowseView: Update filters: {sortBy: "releaseDate"}
    BrowseView->>BrowseView: Update URL: ?sortBy=releaseDate
    BrowseView->>API Client: GET /api/games?sortBy=releaseDate&sortOrder=asc
    API Client->>Backend: Request with new sort
    Backend->>GameService: searchGames({sortBy: "releaseDate", sortOrder: "asc"})
    GameService->>GameService: Map to column: g.releaseDate
    GameService->>GameService: Build SQL: ORDER BY g.releaseDate ASC
    GameService-->>Backend: Sorted results
    Backend-->>Browser: Games sorted by release date
    Browser->>User: Display chronologically

    User->>Browser: Click "Release Date" again (toggle order)
    Browser->>SortControl: Toggle sortOrder
    SortControl->>BrowseView: Update filters: {sortOrder: "desc"}
    BrowseView->>API Client: GET /api/games?sortBy=releaseDate&sortOrder=desc
    API Client->>Backend: Request with reversed order
    Backend->>GameService: searchGames({sortBy: "releaseDate", sortOrder: "desc"})
    GameService->>GameService: Build SQL: ORDER BY g.releaseDate DESC
    GameService-->>Backend: Reverse sorted results
    Backend-->>Browser: Newest games first
    Browser->>User: Display reverse chronologically
```

### Sort Column Mapping

```typescript
private getSortColumn(sortBy: string): string {
  const columnMap: Record<string, string> = {
    title: 'g.orderTitle',      // Normalized for sorting
    releaseDate: 'g.releaseDate',
    dateAdded: 'g.dateAdded',
    developer: 'g.developer'
  };
  return columnMap[sortBy] || 'g.orderTitle';
}

// Usage in query
const sortColumn = this.getSortColumn(query.sortBy);
sql += ` ORDER BY ${sortColumn} ${query.sortOrder.toUpperCase()}`;
```

## 9. Cache Management Flow

### User Story
As a user, I want my data to stay fresh but also load quickly from cache when appropriate.

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

### Stale-While-Revalidate Strategy

```typescript
// TanStack Query configuration
useQuery({
  queryKey: ['games', filters],
  queryFn: () => gamesApi.search(filters),
  staleTime: 5 * 60 * 1000,        // 5 minutes - consider fresh
  cacheTime: 10 * 60 * 1000,       // 10 minutes - keep in memory
  refetchOnWindowFocus: true,      // Refresh when tab gains focus
  refetchOnReconnect: true,        // Refresh when back online
  keepPreviousData: true           // Show old data while fetching new
});
```

**Timeline**:
```
t=0: Fetch data → Cache (fresh)
t=3min: Return from cache (still fresh)
t=6min: Return from cache (stale) + Fetch in background
t=6min+200ms: Background fetch complete → Update cache
t=11min: Cache expired → Fetch immediately
```

## Conclusion

These data flow diagrams illustrate the complete journey of data through the Flashpoint Web system. Key patterns include:

1. **Layered Architecture**: Clear separation between UI, API, service, and data layers
2. **Smart Caching**: TanStack Query provides intelligent cache management
3. **Optimistic Updates**: UI updates immediately with rollback on error
4. **Parallel Loading**: Multiple queries execute concurrently for performance
5. **Debouncing**: User input is debounced to reduce unnecessary requests
6. **State Synchronization**: URL state, local state, and server state stay in sync

Understanding these flows is essential for debugging issues, optimizing performance, and extending the system with new features.
