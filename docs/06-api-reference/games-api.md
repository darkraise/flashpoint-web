# Games API

Endpoints for searching, browsing, and retrieving game information from the Flashpoint Archive.

## Search Games

Search and filter games with pagination.

**Endpoint:** `GET /api/games`

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Search term (matches title, developer, publisher) |
| `platform` | string | - | Comma-separated platform names (e.g., "Flash,HTML5") |
| `series` | string | - | Comma-separated series names |
| `developers` | string | - | Comma-separated developer names |
| `publishers` | string | - | Comma-separated publisher names |
| `playModes` | string | - | Comma-separated play modes |
| `languages` | string | - | Comma-separated language codes |
| `library` | enum | - | Filter by library: "arcade" or "theatre" |
| `tags` | string | - | Comma-separated tag names |
| `yearFrom` | integer | - | Filter games from this year (1970-2100) |
| `yearTo` | integer | - | Filter games up to this year (1970-2100) |
| `sortBy` | enum | `title` | Sort field: "title", "releaseDate", "dateAdded", "developer" |
| `sortOrder` | enum | `asc` | Sort order: "asc" or "desc" |
| `page` | integer | `1` | Page number (min: 1) |
| `limit` | integer | `50` | Items per page (min: 1, max: 100) |
| `showBroken` | boolean | `false` | Include broken games |
| `showExtreme` | boolean | `false` | Include extreme content |

**Response:** `200 OK`

```json
{
  "games": [
    {
      "id": "abc123-def456",
      "title": "Super Flash Game",
      "developer": "Flash Studios",
      "publisher": "Game Publisher Inc",
      "platformName": "Flash",
      "dateAdded": "2023-01-15T10:30:00Z",
      "releaseDate": "2008-05-20",
      "series": "Super Series",
      "playMode": "Single Player",
      "language": "en",
      "library": "arcade",
      "tags": "Action;Platformer;Retro",
      "tagsStr": "Action;Platformer;Retro",
      "description": "A classic Flash platformer game...",
      "launchCommand": "game.swf",
      "applicationPath": "",
      "source": "http://originaldomain.com/games/super-flash-game",
      "presentOnDisk": true,
      "activeDataOnDisk": true,
      "broken": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "totalPages": 25
  }
}
```

**Examples:**

```bash
# Search for Flash platformer games
curl "http://localhost:3100/api/games?search=platformer&platform=Flash&sortBy=releaseDate&sortOrder=desc"

# Get page 2 of arcade games
curl "http://localhost:3100/api/games?library=arcade&page=2&limit=20"

# Filter by year range and tags
curl "http://localhost:3100/api/games?yearFrom=2005&yearTo=2010&tags=Action,Adventure"
```

```javascript
// axios with query params
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    search: 'platformer',
    platform: 'Flash,HTML5',
    sortBy: 'releaseDate',
    sortOrder: 'desc',
    page: 1,
    limit: 50
  }
});

const { games, pagination } = data;
```

---

## Get Filter Options

Get all available filter options for dropdowns (platforms, developers, publishers, etc.).

**Endpoint:** `GET /api/games/filter-options`

**Authentication:** Not required

**Response:** `200 OK`

```json
{
  "platforms": [
    { "name": "Flash", "count": 45234 },
    { "name": "HTML5", "count": 12453 },
    { "name": "Unity", "count": 3421 }
  ],
  "developers": [
    { "name": "Developer Name", "count": 234 }
  ],
  "publishers": [
    { "name": "Publisher Name", "count": 156 }
  ],
  "series": [
    { "name": "Series Name", "count": 45 }
  ],
  "playModes": [
    { "name": "Single Player", "count": 23456 },
    { "name": "Multiplayer", "count": 5678 }
  ],
  "languages": [
    { "code": "en", "name": "English", "count": 34567 },
    { "code": "ja", "name": "Japanese", "count": 8901 }
  ]
}
```

**Examples:**

```bash
curl http://localhost:3100/api/games/filter-options
```

```javascript
const { data: filterOptions } = await axios.get(
  'http://localhost:3100/api/games/filter-options'
);

// Use in UI dropdowns
const platformOptions = filterOptions.platforms.map(p => ({
  label: `${p.name} (${p.count})`,
  value: p.name
}));
```

---

## Get Random Game

Get a random game, optionally filtered by library.

**Endpoint:** `GET /api/games/random`

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `library` | string | Filter by library: "arcade" or "theatre" |

**Response:** `200 OK`

```json
{
  "id": "xyz789-abc123",
  "title": "Random Flash Game",
  "developer": "Game Developer",
  "publisher": "Publisher Name",
  "platformName": "Flash",
  "dateAdded": "2023-03-10T14:20:00Z",
  "releaseDate": "2009-11-15",
  "series": "",
  "playMode": "Single Player",
  "language": "en",
  "library": "arcade",
  "tags": "Puzzle;Strategy",
  "tagsStr": "Puzzle;Strategy",
  "description": "A challenging puzzle game...",
  "launchCommand": "random-game.swf",
  "source": "http://example.com/games/random"
}
```

**Error Responses:**

- `404 Not Found` - No games found matching criteria

**Examples:**

```bash
# Get any random game
curl http://localhost:3100/api/games/random

# Get random arcade game
curl "http://localhost:3100/api/games/random?library=arcade"
```

```javascript
const { data: randomGame } = await axios.get(
  'http://localhost:3100/api/games/random',
  { params: { library: 'arcade' } }
);
```

---

## Get Game Details

Get detailed information about a specific game.

**Endpoint:** `GET /api/games/:id`

**Authentication:** Not required

**URL Parameters:**

- `id` (string, required) - Game ID

**Response:** `200 OK`

```json
{
  "id": "abc123-def456",
  "title": "Super Flash Game",
  "alternateTitles": "Alternative Title",
  "developer": "Flash Studios",
  "publisher": "Game Publisher Inc",
  "platformName": "Flash",
  "dateAdded": "2023-01-15T10:30:00Z",
  "dateModified": "2023-06-20T09:15:00Z",
  "releaseDate": "2008-05-20",
  "version": "1.2",
  "series": "Super Series",
  "playMode": "Single Player",
  "status": "Playable",
  "notes": "Requires Flash Player 10+",
  "language": "en",
  "library": "arcade",
  "tags": "Action;Platformer;Retro",
  "tagsStr": "Action;Platformer;Retro",
  "description": "A classic Flash platformer game with retro graphics...",
  "launchCommand": "game.swf",
  "applicationPath": "FPSoftware\\Flash\\flashplayer_32_sa.exe",
  "source": "http://originaldomain.com/games/super-flash-game",
  "originalDescription": "Play this awesome platformer!",
  "presentOnDisk": true,
  "activeDataOnDisk": true,
  "activeDataId": 1,
  "broken": false,
  "extreme": false,
  "playCount": 0,
  "archiveState": 0
}
```

**Error Responses:**

- `404 Not Found` - Game not found

**Examples:**

```bash
curl http://localhost:3100/api/games/abc123-def456
```

```javascript
const gameId = 'abc123-def456';
const { data: game } = await axios.get(
  `http://localhost:3100/api/games/${gameId}`
);
```

---

## Get Launch Data

Get data needed to launch and play a game in the browser.

**Endpoint:** `GET /api/games/:id/launch`

**Authentication:** Not required (but playing requires `games.play` permission)

**URL Parameters:**

- `id` (string, required) - Game ID

**Response:** `200 OK`

```json
{
  "gameId": "abc123-def456",
  "title": "Super Flash Game",
  "platform": "Flash",
  "launchCommand": "game.swf",
  "contentUrl": "http://localhost:22500/http://originaldomain.com/games/game.swf",
  "applicationPath": "FPSoftware\\Flash\\flashplayer_32_sa.exe",
  "playMode": "Single Player",
  "canPlayInBrowser": true
}
```

**Field Descriptions:**

- `contentUrl` - Full URL to load in player (proxied through game-service)
- `canPlayInBrowser` - Whether the game can be played in browser (Flash/HTML5 with content)
- `launchCommand` - Original launch command from database
- `applicationPath` - Desktop application path (for non-web playable games)

**Error Responses:**

- `404 Not Found` - Game not found

**Examples:**

```bash
curl http://localhost:3100/api/games/abc123-def456/launch
```

```javascript
const gameId = 'abc123-def456';
const { data: launchData } = await axios.get(
  `http://localhost:3100/api/games/${gameId}/launch`
);

if (launchData.canPlayInBrowser) {
  // Load game in Ruffle or HTML5 player
  loadGameInPlayer(launchData.contentUrl, launchData.platform);
} else {
  // Show download/install instructions
  showDesktopLaunchInstructions(launchData.applicationPath);
}
```

---

## Get Related Games

Get games related to a specific game (based on developer, series, tags).

**Endpoint:** `GET /api/games/:id/related`

**Authentication:** Not required

**URL Parameters:**

- `id` (string, required) - Game ID

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `10` | Maximum number of related games (max: 50) |

**Response:** `200 OK`

```json
[
  {
    "id": "related-game-1",
    "title": "Super Flash Game 2",
    "developer": "Flash Studios",
    "platformName": "Flash",
    "releaseDate": "2009-08-10",
    "series": "Super Series",
    "tags": "Action;Platformer;Retro",
    "description": "The sequel to the original..."
  },
  {
    "id": "related-game-2",
    "title": "Another Flash Game",
    "developer": "Flash Studios",
    "platformName": "Flash",
    "releaseDate": "2008-03-15",
    "series": "",
    "tags": "Action;Adventure",
    "description": "A different game by the same developer..."
  }
]
```

**Examples:**

```bash
# Get 5 related games
curl "http://localhost:3100/api/games/abc123-def456/related?limit=5"
```

```javascript
const gameId = 'abc123-def456';
const { data: relatedGames } = await axios.get(
  `http://localhost:3100/api/games/${gameId}/related`,
  { params: { limit: 10 } }
);
```

---

## Game Search Best Practices

### Performance Optimization

1. **Use Pagination**: Always specify reasonable `limit` values (20-50 items)
2. **Filter Early**: Apply filters to reduce result set before sorting
3. **Specific Searches**: Combine search terms with filters for faster results

### Search Tips

1. **Partial Matching**: Search terms match partial strings (case-insensitive)
2. **Multiple Filters**: Combine filters to narrow results (AND logic)
3. **Tag Searching**: Use exact tag names from `/api/tags` endpoint
4. **Year Range**: Use `yearFrom`/`yearTo` for temporal filtering

### Example Complex Search

```javascript
// Find Flash platformer games from 2005-2010, sorted by rating
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    platform: 'Flash',
    tags: 'Platformer',
    yearFrom: 2005,
    yearTo: 2010,
    sortBy: 'releaseDate',
    sortOrder: 'desc',
    page: 1,
    limit: 50
  }
});
```

## Game Data Fields

### Key Fields

- `id`: Unique game identifier (UUID)
- `title`: Game display name
- `platformName`: Gaming platform (Flash, HTML5, Unity, etc.)
- `library`: Category ("arcade" for games, "theatre" for animations)
- `presentOnDisk`: Whether game files are available locally
- `canPlayInBrowser`: Computed field indicating web playability

### Content Fields

- `description`: Full game description
- `originalDescription`: Original description from source
- `notes`: Additional notes or requirements
- `tags`/`tagsStr`: Semicolon-separated tag list

### Metadata Fields

- `dateAdded`: When game was added to Flashpoint
- `dateModified`: Last modification date
- `releaseDate`: Original release date
- `version`: Game version number

### Launch Fields

- `launchCommand`: File or URL to launch
- `applicationPath`: Desktop application for non-web games
- `source`: Original game URL/source

### Status Fields

- `broken`: Game is known to be broken
- `extreme`: Contains extreme content
- `status`: Playability status
- `archiveState`: Archive state code
