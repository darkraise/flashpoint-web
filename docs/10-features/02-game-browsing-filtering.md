# Game Browsing & Filtering

## Overview

Game browsing and filtering provides a comprehensive interface for discovering and exploring games from the Flashpoint Archive. Users can search, filter by multiple criteria, sort results, and navigate through paginated collections with grid and list view options.

## Architecture

**Backend Components:**
- `GameService`: Database queries and filtering logic
- Game routes (routes/games.ts): REST API endpoints
- Query builder with dynamic WHERE clauses

**Frontend Components:**
- `BrowseView`: Main game browsing page
- `FilterPanel`: Advanced filter UI
- `SearchBar`: Search input component
- `GameGrid`: Grid view layout
- `GameCard`: Individual game card
- `ViewOptions`: View mode and pagination controls

## Features

**Search:**
- Free-text search across game titles
- Real-time search with debouncing (300ms)
- Search persisted in URL query parameters

**Filters:**
- Platform, Series, Developer, Publisher
- Play Mode, Language, Tags
- Year Range (1970-2100)
- Library (arcade/theatre)
- Show/hide broken games and extreme content

**Sorting:**
- By: Title, Release Date, Date Added, Developer
- Order: Ascending (A-Z) or Descending (Z-A)

**Pagination:**
- Configurable items per page (default: 50, max: 100)
- Page navigation controls
- Total count display

**View Modes:**
- Grid view (responsive 1-5 columns)
- List view (compact table format)
- Adjustable card size

## API Endpoints

#### GET /api/games
Get paginated list of games with filters.

**Query Parameters:**
- `search` - Search in titles
- `platform`, `series`, `developers`, `publishers` - Comma-separated
- `playModes`, `languages`, `tags` - Comma-separated
- `library` - 'arcade' or 'theatre'
- `yearFrom`, `yearTo` - Release year range
- `sortBy` - 'title', 'releaseDate', 'dateAdded', 'developer'
- `sortOrder` - 'asc' or 'desc'
- `page` - Page number
- `limit` - Items per page
- `showBroken`, `showExtreme` - Boolean toggles

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Super Mario Flash",
      "series": "Mario",
      "developer": "Pouetpu Games",
      "platform": "Flash",
      "releaseDate": "2007-06-25",
      "language": "en",
      "library": "arcade",
      "presentOnDisk": true
    }
  ],
  "total": 15234,
  "page": 1,
  "limit": 50,
  "totalPages": 305
}
```

#### GET /api/games/filter-options
Get all available filter options with counts.

**Response:**
```json
{
  "platforms": [
    { "name": "Flash", "count": 85234 },
    { "name": "HTML5", "count": 12456 }
  ],
  "series": [ { "name": "Mario", "count": 234 } ],
  "developers": [ { "name": "Newgrounds", "count": 5432 } ],
  "publishers": [ { "name": "Armor Games", "count": 2341 } ],
  "playModes": [ { "name": "Single Player", "count": 45678 } ],
  "languages": [ { "name": "en", "count": 67890 } ],
  "tags": [ { "name": "Puzzle", "count": 8765 } ]
}
```

#### GET /api/games/:id
Get detailed information for a single game.

**Response:** Game object with full metadata and tags array

## Database Queries

**Main Query Structure:**
```sql
SELECT g.*, p.name as platformName,
  (SELECT COUNT(*) FROM game_data WHERE gameId = g.id) > 0 as presentOnDisk
FROM game g
LEFT JOIN platform p ON g.platformId = p.id
WHERE [filter conditions]
ORDER BY [sortBy] [sortOrder]
LIMIT [limit] OFFSET [offset]
```

**Filter Conditions:**
- Search: `(g.title LIKE ? OR g.alternateTitles LIKE ?)`
- Platforms: `p.name IN (?)`
- Series: `g.series IN (?)`
- Year Range: `CAST(substr(g.releaseDate, 1, 4) AS INTEGER) BETWEEN ? AND ?`
- Broken: `g.status != 'broken'`

## Performance Optimizations

**Debouncing:**
- Search input: 300ms delay
- Year inputs: 500ms delay
- Prevents excessive API calls

**Query Caching:**
- Filter options cached for 5 minutes
- Game results cached with unique query keys
- Stale-while-revalidate strategy

**Database Indexes:**
```sql
CREATE INDEX idx_game_title ON game(title);
CREATE INDEX idx_game_platform ON game(platformId);
CREATE INDEX idx_game_library ON game(library);
CREATE INDEX idx_game_release_date ON game(releaseDate);
```

## State Management

**URL State (React Router search params):**
- All filter values, search, sort, pagination
- Enables shareable URLs
- Preserved on navigation

**Query State (TanStack Query):**
- Game data caching
- Filter options caching
- Automatic refetch on filter change

**UI State (Local component state):**
- Dropdown open/close states
- View mode selection
- Card size preference

## Common Use Cases

### 1. Basic Search
```typescript
// URL: ?search=mario
// API: GET /api/games?search=mario&page=1&limit=50
```

### 2. Filter by Multiple Platforms
```typescript
// URL: ?platform=Flash,HTML5
// API: GET /api/games?platform=Flash,HTML5&page=1
```

### 3. Advanced Filtering
```typescript
const filters = {
  platform: 'Flash,HTML5',
  tags: 'Puzzle,Action',
  yearFrom: 2000,
  yearTo: 2010,
  sortBy: 'releaseDate',
  sortOrder: 'desc'
};
```

### 4. Platform-Specific View
```tsx
<BrowseView
  platformFilter="Flash"
  showPlatformFilter={false}
/>
```

### 5. Shareable Filtered Link
```
https://flashpoint.local/browse?platform=Flash&tags=Puzzle&yearFrom=2005
```

## Best Practices

1. Always sync filters with URL for shareable links
2. Use debounced inputs for text and number fields
3. Show loading skeletons while fetching data
4. Display friendly messages when no results found
5. Design filters to work on small screens
6. Limit query complexity with pagination
7. Cache filter options to reduce API calls
8. Validate query parameters on backend

## Troubleshooting

**No results found:**
- Check if filters are too restrictive
- Verify database connectivity
- Check for typos in search query
- Ensure filter values are valid

**Slow filtering:**
- Add database indexes on filter columns
- Reduce page size
- Check for complex tag queries
- Monitor database query performance

**Filters not working:**
- Verify URL params are updating
- Check API query parameter parsing
- Ensure filter values are properly encoded
- Validate query schema with Zod

**Mobile filter issues:**
- Check responsive breakpoints
- Verify popover positioning
- Test touch interactions
- Ensure dropdowns close properly
