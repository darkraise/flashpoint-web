# Game Browsing & Filtering

## Overview

The game browsing and filtering feature provides a comprehensive interface for discovering and exploring games from the Flashpoint Archive. Users can search, filter by multiple criteria, sort results, and navigate through paginated game collections with both grid and list view options.

## User-Facing Functionality

### Search
- Free-text search across game titles
- Real-time search as you type (with debouncing)
- Search persisted in URL query parameters
- Clear search functionality

### Advanced Filters

**Platform Filter:**
- Filter by gaming platform (Flash, HTML5, Shockwave, Unity, etc.)
- Multi-select support
- Shows game count per platform
- Platform-specific views (Flash Games, HTML5 Games)

**Series Filter:**
- Filter by game series/franchises
- Multi-select checkboxes
- Displays game count for each series

**Developer Filter:**
- Filter by game developer/creator
- Multi-select support
- Shows number of games per developer

**Publisher Filter:**
- Filter by game publisher
- Multi-select checkboxes
- Game count displayed

**Play Mode Filter:**
- Single-player, Multiplayer, Co-op, etc.
- Multi-select support
- Count of games for each mode

**Language Filter:**
- Filter by game language
- Multi-select support
- Game count per language

**Tags Filter:**
- Filter by game categories/genres
- Multi-select with popular tags shown
- Tag counts displayed
- Visual badges for selected tags

**Year Range Filter:**
- Filter by release year (1970-2100)
- From/To year inputs
- Debounced input for performance

**Library Filter:**
- Arcade (games) or Theatre (animations)
- Toggle between libraries
- Dedicated views for each

**Content Filters:**
- Show/Hide broken games
- Show/Hide extreme content
- Boolean toggles

### Sorting
- **Sort By:**
  - Title (alphabetical)
  - Release Date
  - Date Added to archive
  - Developer name

- **Sort Order:**
  - Ascending (A-Z, oldest first)
  - Descending (Z-A, newest first)

### Pagination
- Configurable items per page (default: 50, max: 100)
- Page navigation controls
- Total count display
- Current page indicator
- First/Previous/Next/Last page buttons

### View Modes
- **Grid View:**
  - Card-based layout
  - Game screenshots/logos
  - Hover effects and animations
  - Responsive grid (1-5 columns)
  - Adjustable card size

- **List View:**
  - Compact table format
  - More games visible at once
  - Platform icons
  - Quick access to details

### Filter Management
- Selected filters shown as removable badges
- "Clear All" buttons per filter category
- Filters persist in URL (shareable links)
- Filter state preserved on navigation

## Technical Implementation

### Architecture

**Backend Components:**
- `GameService`: Database queries and filtering logic
- `DatabaseService`: Flashpoint database connection
- Game routes (routes/games.ts): REST API endpoints
- Query builder with dynamic WHERE clauses

**Frontend Components:**
- `BrowseView`: Main game browsing page
- `FilterPanel`: Advanced filter UI
- `SearchBar`: Search input component
- `GameGrid`: Grid view layout
- `GameList`: List view layout
- `GameCard`: Individual game card
- `GameListItem`: List item component
- `ViewOptions`: View mode and pagination controls

### Database Queries

The game browsing system queries the Flashpoint Archive database (`flashpoint.sqlite`):

**Main Query Structure:**
```sql
SELECT
  g.id,
  g.title,
  g.alternateTitles,
  g.series,
  g.developer,
  g.publisher,
  g.platform,
  g.playMode,
  g.status,
  g.notes,
  g.source,
  g.applicationPath,
  g.launchCommand,
  g.releaseDate,
  g.version,
  g.originalDescription,
  g.language,
  g.library,
  g.dateAdded,
  g.dateModified,
  p.name as platformName,
  (SELECT COUNT(*) FROM game_data WHERE gameId = g.id) > 0 as presentOnDisk
FROM game g
LEFT JOIN platform p ON g.platformId = p.id
WHERE 1=1
  [AND conditions based on filters]
ORDER BY [sortBy] [sortOrder]
LIMIT [limit] OFFSET [offset]
```

**Filter Conditions:**
- Search: `(g.title LIKE ? OR g.alternateTitles LIKE ?)`
- Platforms: `p.name IN (?)`
- Series: `g.series IN (?)`
- Developers: `g.developer IN (?)`
- Publishers: `g.publisher IN (?)`
- Play Modes: `g.playMode IN (?)`
- Languages: `g.language IN (?)`
- Library: `g.library = ?`
- Year Range: `CAST(substr(g.releaseDate, 1, 4) AS INTEGER) BETWEEN ? AND ?`
- Broken: `g.status != 'broken'`
- Extreme: `g.id NOT IN (SELECT gameId FROM game_tags_tag ...)`

### API Endpoints

#### GET /api/games
Get paginated list of games with filters.

**Query Parameters:**
```typescript
{
  search?: string;           // Search in titles
  platform?: string;         // Comma-separated platforms
  series?: string;           // Comma-separated series
  developers?: string;       // Comma-separated developers
  publishers?: string;       // Comma-separated publishers
  playModes?: string;        // Comma-separated play modes
  languages?: string;        // Comma-separated languages
  library?: 'arcade' | 'theatre';
  tags?: string;             // Comma-separated tag names
  yearFrom?: number;         // Release year from (1970-2100)
  yearTo?: number;           // Release year to (1970-2100)
  sortBy?: 'title' | 'releaseDate' | 'dateAdded' | 'developer';
  sortOrder?: 'asc' | 'desc';
  page?: number;             // Page number (min: 1)
  limit?: number;            // Items per page (1-100)
  showBroken?: boolean;      // Include broken games
  showExtreme?: boolean;     // Include extreme content
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Super Mario Flash",
      "alternateTitles": "",
      "series": "Mario",
      "developer": "Pouetpu Games",
      "publisher": "Newgrounds",
      "platform": "Flash",
      "platformName": "Flash",
      "playMode": "Single Player",
      "status": "playable",
      "notes": "",
      "source": "https://www.newgrounds.com/portal/view/396724",
      "applicationPath": ":http: :message:",
      "launchCommand": "http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
      "releaseDate": "2007-06-25",
      "version": "",
      "originalDescription": "A fan-made Mario platformer...",
      "language": "en",
      "library": "arcade",
      "dateAdded": "2018-01-15T10:30:00.000Z",
      "dateModified": "2022-03-20T14:45:00.000Z",
      "presentOnDisk": true
    }
    // ... more games
  ],
  "total": 15234,
  "page": 1,
  "limit": 50,
  "totalPages": 305
}
```

#### GET /api/games/filter-options
Get all available filter options with counts.

**Response (200 OK):**
```json
{
  "platforms": [
    { "name": "Flash", "count": 85234 },
    { "name": "HTML5", "count": 12456 },
    { "name": "Shockwave", "count": 8923 }
  ],
  "series": [
    { "name": "Mario", "count": 234 },
    { "name": "Sonic", "count": 189 }
  ],
  "developers": [
    { "name": "Newgrounds", "count": 5432 },
    { "name": "Kongregate", "count": 3210 }
  ],
  "publishers": [
    { "name": "Armor Games", "count": 2341 }
  ],
  "playModes": [
    { "name": "Single Player", "count": 45678 },
    { "name": "Multiplayer", "count": 12345 }
  ],
  "languages": [
    { "name": "en", "count": 67890 },
    { "name": "es", "count": 5432 }
  ],
  "tags": [
    { "name": "Puzzle", "count": 8765 },
    { "name": "Action", "count": 12345 }
  ]
}
```

#### GET /api/games/:id
Get detailed information for a single game.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Super Mario Flash",
  "alternateTitles": "SMF",
  "series": "Mario",
  "developer": "Pouetpu Games",
  "publisher": "Newgrounds",
  "platform": "Flash",
  "platformName": "Flash",
  "playMode": "Single Player",
  "status": "playable",
  "notes": "Works great in Ruffle",
  "source": "https://www.newgrounds.com/portal/view/396724",
  "applicationPath": ":http: :message:",
  "launchCommand": "http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "releaseDate": "2007-06-25",
  "version": "1.0",
  "originalDescription": "A fan-made Mario platformer with level editor...",
  "language": "en",
  "library": "arcade",
  "dateAdded": "2018-01-15T10:30:00.000Z",
  "dateModified": "2022-03-20T14:45:00.000Z",
  "presentOnDisk": true,
  "tags": ["Platformer", "Level Editor", "Flash"]
}
```

**Errors:**
- 404: Game not found

### State Management

**URL State (React Router search params):**
- All filter values
- Search query
- Sort options
- Pagination state
- Enables shareable URLs

**Query State (TanStack Query):**
- Game data caching
- Filter options caching
- Automatic refetch on filter change
- Loading and error states

**UI State (Local component state):**
- Dropdown open/close states
- View mode selection
- Card size preference

### Filter Panel Implementation

The `FilterPanel` component provides a comprehensive filtering UI:

**Desktop Layout:**
- Single row of filter dropdowns
- All filters visible simultaneously
- Year range inline
- Sort controls on the right

**Mobile Layout:**
- Stacked filter rows
- Compact icon-based dropdowns
- Responsive breakpoints

**Filter Dropdown Features:**
- Checkbox multi-select
- Search within options (future)
- Game count display
- "Clear All" button
- Popover positioning (auto-adjust)
- Keyboard navigation

**Selected Filter Display:**
- Visual badges showing active filters
- One-click removal per filter
- Grouped by filter type
- Color-coded by category

### Performance Optimizations

**Debouncing:**
- Search input: 300ms delay
- Year inputs: 500ms delay
- Prevents excessive API calls

**Query Caching:**
- Filter options cached for 5 minutes
- Game results cached with unique query keys
- Stale-while-revalidate strategy

**Pagination:**
- Limits database load
- Configurable page size
- Efficient OFFSET queries with indexes

**Database Indexes:**
```sql
CREATE INDEX idx_game_title ON game(title);
CREATE INDEX idx_game_platform ON game(platformId);
CREATE INDEX idx_game_library ON game(library);
CREATE INDEX idx_game_release_date ON game(releaseDate);
CREATE INDEX idx_game_date_added ON game(dateAdded);
CREATE INDEX idx_game_developer ON game(developer);
```

## UI Components

### FilterPanel
**Location:** `frontend/src/components/search/FilterPanel.tsx`

**Props:**
```typescript
interface FilterPanelProps {
  filters: {
    platform?: string;
    series?: string;
    developers?: string;
    publishers?: string;
    playModes?: string;
    languages?: string;
    tags?: string;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: string;
    sortOrder?: string;
    webPlayableOnly?: boolean;
  };
  showPlatformFilter?: boolean;  // Hide for platform-specific views
}
```

### GameBrowseLayout
**Location:** `frontend/src/components/library/GameBrowseLayout.tsx`

**Features:**
- Integrates search, filters, and view controls
- Manages view mode state
- Handles pagination
- Responsive layout

### GameCard
**Location:** `frontend/src/components/library/GameCard.tsx`

**Features:**
- Game screenshot/logo display
- Title and metadata
- Platform badge
- Hover effects
- Click to view details
- Add to playlist button
- Play button

### GameGrid
**Location:** `frontend/src/components/library/GameGrid.tsx`

**Features:**
- Responsive grid layout (1-5 columns)
- Card size control
- Loading skeletons
- Empty state handling

### ViewOptions
**Location:** `frontend/src/components/common/ViewOptions.tsx`

**Features:**
- Grid/List toggle
- Card size slider
- Sort controls
- Items per page selector

## Common Use Cases

### 1. Basic Search
```typescript
// User types in search bar
// URL updates: ?search=mario
// API call: GET /api/games?search=mario&page=1&limit=50
```

### 2. Filter by Multiple Platforms
```typescript
// User selects Flash and HTML5
// URL updates: ?platform=Flash,HTML5
// API call: GET /api/games?platform=Flash,HTML5&page=1&limit=50
```

### 3. Advanced Filtering
```typescript
// Multiple filters combined
const filters = {
  platform: 'Flash,HTML5',
  tags: 'Puzzle,Action',
  yearFrom: 2000,
  yearTo: 2010,
  sortBy: 'releaseDate',
  sortOrder: 'desc'
};

// URL: ?platform=Flash,HTML5&tags=Puzzle,Action&yearFrom=2000&yearTo=2010&sortBy=releaseDate&sortOrder=desc
```

### 4. Platform-Specific View
```tsx
// Flash Games View
<BrowseView
  platformFilter="Flash"
  showPlatformFilter={false}
/>

// Automatically filters to Flash platform
// Hides platform filter dropdown
```

### 5. Sort and Paginate
```typescript
// Sort by newest first
updateFilter('sortBy', 'dateAdded');
updateFilter('sortOrder', 'desc');

// Go to page 2
updateFilter('page', '2');
```

### 6. Shareable Filtered Link
```
// User can share URL with all filters applied
https://flashpoint.local/browse?platform=Flash&tags=Puzzle&yearFrom=2005&sortBy=title&page=1
```

## Filter Combinations

### Available Filter Combinations

1. **Search + Platform + Tags**
   ```
   ?search=mario&platform=Flash&tags=Platformer
   ```

2. **Year Range + Developer**
   ```
   ?yearFrom=2000&yearTo=2005&developers=Newgrounds
   ```

3. **Library + Play Mode + Language**
   ```
   ?library=arcade&playModes=Single%20Player&languages=en
   ```

4. **Series + Publisher + Year Range**
   ```
   ?series=Sonic&publishers=SEGA&yearFrom=1990&yearTo=2000
   ```

All filters can be combined simultaneously for powerful search capabilities.

## Best Practices

1. **URL State:** Always sync filters with URL for shareable links
2. **Debouncing:** Use debounced inputs for text and number fields
3. **Loading States:** Show skeletons while fetching data
4. **Error Handling:** Display friendly messages on API errors
5. **Empty States:** Show helpful messages when no results found
6. **Mobile First:** Design filters to work on small screens
7. **Performance:** Limit query complexity and use pagination
8. **Caching:** Cache filter options to reduce API calls

## Troubleshooting

### No results found
- Check if filters are too restrictive
- Verify database connectivity
- Check for typos in search query
- Ensure filter values are valid

### Slow filtering
- Add database indexes on filter columns
- Reduce page size
- Check for complex tag queries
- Monitor database query performance

### Filters not working
- Verify URL params are updating
- Check API query parameter parsing
- Ensure filter values are properly encoded
- Validate query schema with Zod

### Mobile filter issues
- Check responsive breakpoints
- Verify popover positioning
- Test touch interactions
- Ensure dropdowns close properly

## Future Enhancements

- Saved filter presets
- Recent searches
- Search suggestions/autocomplete
- Advanced search syntax
- Filter by file size/type
- Filter by rating (when implemented)
- Export search results
- Bulk operations on filtered results
- Filter analytics (popular searches)
- AI-powered game recommendations based on filters
