# Playlists API

Endpoints for managing game playlists (curated collections of games).

## List Playlists

Get all available playlists.

**Endpoint:** `GET /api/playlists`

**Authentication:** Not required

**Response:** `200 OK`

```json
[
  {
    "id": "playlist-uuid-1",
    "title": "Best Flash Platformers",
    "description": "Classic Flash platformer games from the 2000s",
    "author": "Flashpoint Curator",
    "icon": "platformer-icon.png",
    "library": "arcade",
    "extreme": false,
    "gameCount": 45
  },
  {
    "id": "playlist-uuid-2",
    "title": "Puzzle Games Collection",
    "description": "Mind-bending puzzle games",
    "author": "Community",
    "icon": "puzzle-icon.png",
    "library": "arcade",
    "extreme": false,
    "gameCount": 78
  }
]
```

**Examples:**

```bash
curl http://localhost:3100/api/playlists
```

```javascript
const { data: playlists } = await axios.get(
  'http://localhost:3100/api/playlists'
);

// Display in UI
playlists.forEach(playlist => {
  console.log(`${playlist.title}: ${playlist.gameCount} games`);
});
```

---

## Get Playlist

Get detailed information about a specific playlist including all games.

**Endpoint:** `GET /api/playlists/:id`

**Authentication:** Not required

**URL Parameters:**

- `id` (string, required) - Playlist ID (UUID)

**Response:** `200 OK`

```json
{
  "id": "playlist-uuid-1",
  "title": "Best Flash Platformers",
  "description": "Classic Flash platformer games from the 2000s",
  "author": "Flashpoint Curator",
  "icon": "platformer-icon.png",
  "library": "arcade",
  "extreme": false,
  "games": [
    {
      "id": "game-uuid-1",
      "title": "Super Platform Adventure",
      "developer": "Flash Studios",
      "platformName": "Flash",
      "releaseDate": "2008-05-15",
      "tags": "Platformer;Action",
      "description": "Jump and run through challenging levels..."
    },
    {
      "id": "game-uuid-2",
      "title": "Pixel Jumper",
      "developer": "Retro Games Inc",
      "platformName": "Flash",
      "releaseDate": "2007-11-20",
      "tags": "Platformer;Retro",
      "description": "Classic pixel art platformer..."
    }
  ]
}
```

**Error Responses:**

- `404 Not Found` - Playlist not found

**Examples:**

```bash
curl http://localhost:3100/api/playlists/playlist-uuid-1
```

```javascript
const playlistId = 'playlist-uuid-1';
const { data: playlist } = await axios.get(
  `http://localhost:3100/api/playlists/${playlistId}`
);

console.log(`${playlist.title}: ${playlist.games.length} games`);
```

---

## Create Playlist

Create a new custom playlist.

**Endpoint:** `POST /api/playlists`

**Authentication:** Not required (but recommended for tracking)

**Request Body:**

```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "author": "string (optional)",
  "icon": "string (optional)",
  "library": "enum (optional): 'arcade' or 'theatre'",
  "extreme": "boolean (optional, default: false)"
}
```

**Response:** `201 Created`

```json
{
  "id": "new-playlist-uuid",
  "title": "My Custom Collection",
  "description": "My favorite games",
  "author": "john_doe",
  "icon": "",
  "library": "arcade",
  "extreme": false,
  "gameCount": 0,
  "games": []
}
```

**Error Responses:**

- `400 Bad Request` - Missing required fields

**Examples:**

```bash
curl -X POST http://localhost:3100/api/playlists \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Custom Collection",
    "description": "My favorite games",
    "author": "john_doe",
    "library": "arcade"
  }'
```

```javascript
const newPlaylist = await axios.post(
  'http://localhost:3100/api/playlists',
  {
    title: 'My Custom Collection',
    description: 'My favorite games',
    author: 'john_doe',
    library: 'arcade',
    extreme: false
  }
);

const playlistId = newPlaylist.data.id;
```

---

## Add Games to Playlist

Add one or more games to a playlist.

**Endpoint:** `POST /api/playlists/:id/games`

**Authentication:** Not required

**URL Parameters:**

- `id` (string, required) - Playlist ID

**Request Body:**

```json
{
  "gameIds": ["game-uuid-1", "game-uuid-2", "game-uuid-3"]
}
```

**Response:** `200 OK`

Returns the updated playlist with all games:

```json
{
  "id": "playlist-uuid-1",
  "title": "My Custom Collection",
  "description": "My favorite games",
  "author": "john_doe",
  "icon": "",
  "library": "arcade",
  "extreme": false,
  "games": [
    {
      "id": "game-uuid-1",
      "title": "Super Flash Game",
      "developer": "Flash Studios",
      "platformName": "Flash",
      "releaseDate": "2008-05-15"
    },
    {
      "id": "game-uuid-2",
      "title": "Another Game",
      "developer": "Game Dev",
      "platformName": "HTML5",
      "releaseDate": "2015-03-20"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid gameIds array
- `404 Not Found` - Playlist not found

**Examples:**

```bash
curl -X POST http://localhost:3100/api/playlists/playlist-uuid-1/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameIds": ["game-uuid-1", "game-uuid-2"]
  }'
```

```javascript
const playlistId = 'playlist-uuid-1';
const gameIds = ['game-uuid-1', 'game-uuid-2', 'game-uuid-3'];

const { data: updatedPlaylist } = await axios.post(
  `http://localhost:3100/api/playlists/${playlistId}/games`,
  { gameIds }
);

console.log(`Added ${gameIds.length} games. Total: ${updatedPlaylist.games.length}`);
```

---

## Remove Games from Playlist

Remove one or more games from a playlist.

**Endpoint:** `DELETE /api/playlists/:id/games`

**Authentication:** Not required

**URL Parameters:**

- `id` (string, required) - Playlist ID

**Request Body:**

```json
{
  "gameIds": ["game-uuid-1", "game-uuid-2"]
}
```

**Response:** `200 OK`

Returns the updated playlist:

```json
{
  "id": "playlist-uuid-1",
  "title": "My Custom Collection",
  "description": "My favorite games",
  "author": "john_doe",
  "icon": "",
  "library": "arcade",
  "extreme": false,
  "games": [
    {
      "id": "game-uuid-3",
      "title": "Remaining Game",
      "developer": "Developer",
      "platformName": "Flash"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid gameIds array
- `404 Not Found` - Playlist not found

**Examples:**

```bash
curl -X DELETE http://localhost:3100/api/playlists/playlist-uuid-1/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameIds": ["game-uuid-1", "game-uuid-2"]
  }'
```

```javascript
const playlistId = 'playlist-uuid-1';
const gameIdsToRemove = ['game-uuid-1', 'game-uuid-2'];

const { data: updatedPlaylist } = await axios.delete(
  `http://localhost:3100/api/playlists/${playlistId}/games`,
  {
    data: { gameIds: gameIdsToRemove }
  }
);
```

---

## Delete Playlist

Delete a playlist permanently.

**Endpoint:** `DELETE /api/playlists/:id`

**Authentication:** Not required

**URL Parameters:**

- `id` (string, required) - Playlist ID

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Playlist deleted"
}
```

**Error Responses:**

- `404 Not Found` - Playlist not found

**Examples:**

```bash
curl -X DELETE http://localhost:3100/api/playlists/playlist-uuid-1
```

```javascript
const playlistId = 'playlist-uuid-1';

await axios.delete(
  `http://localhost:3100/api/playlists/${playlistId}`
);

console.log('Playlist deleted successfully');
```

---

## Playlist Management Workflows

### Creating and Populating a Playlist

```javascript
// 1. Create playlist
const { data: newPlaylist } = await axios.post(
  'http://localhost:3100/api/playlists',
  {
    title: 'My Favorite Platformers',
    description: 'Collection of my favorite platformer games',
    author: 'john_doe',
    library: 'arcade'
  }
);

// 2. Search for games to add
const { data: searchResults } = await axios.get(
  'http://localhost:3100/api/games',
  {
    params: {
      tags: 'Platformer',
      platform: 'Flash',
      limit: 20
    }
  }
);

// 3. Add selected games
const gameIds = searchResults.games.slice(0, 10).map(g => g.id);

await axios.post(
  `http://localhost:3100/api/playlists/${newPlaylist.id}/games`,
  { gameIds }
);

console.log('Playlist created and populated!');
```

### Updating Playlist Contents

```javascript
// Get current playlist
const { data: playlist } = await axios.get(
  `http://localhost:3100/api/playlists/${playlistId}`
);

// Remove games that don't meet criteria
const gamesToRemove = playlist.games
  .filter(game => game.broken || game.extreme)
  .map(game => game.id);

if (gamesToRemove.length > 0) {
  await axios.delete(
    `http://localhost:3100/api/playlists/${playlistId}/games`,
    { data: { gameIds: gamesToRemove } }
  );
}

// Add new games
const newGameIds = ['game-1', 'game-2', 'game-3'];
await axios.post(
  `http://localhost:3100/api/playlists/${playlistId}/games`,
  { gameIds: newGameIds }
);
```

### Exporting/Importing Playlists

```javascript
// Export playlist to JSON
const { data: playlist } = await axios.get(
  `http://localhost:3100/api/playlists/${playlistId}`
);

const playlistExport = {
  title: playlist.title,
  description: playlist.description,
  author: playlist.author,
  library: playlist.library,
  gameIds: playlist.games.map(g => g.id)
};

// Save to file
fs.writeFileSync('playlist-export.json', JSON.stringify(playlistExport, null, 2));

// Import playlist from JSON
const importData = JSON.parse(fs.readFileSync('playlist-export.json', 'utf8'));

const { data: imported } = await axios.post(
  'http://localhost:3100/api/playlists',
  {
    title: importData.title,
    description: importData.description,
    author: importData.author,
    library: importData.library
  }
);

// Add games to imported playlist
await axios.post(
  `http://localhost:3100/api/playlists/${imported.id}/games`,
  { gameIds: importData.gameIds }
);
```

---

## Best Practices

### Playlist Organization

1. **Descriptive Titles**: Use clear, searchable playlist names
2. **Detailed Descriptions**: Explain the playlist's theme or criteria
3. **Author Attribution**: Credit the playlist creator
4. **Library Separation**: Keep arcade and theatre content in separate playlists
5. **Size Management**: Consider splitting very large playlists (>100 games)

### Game Selection

1. **Consistent Theme**: Keep playlists focused on a specific theme or genre
2. **Quality Control**: Regularly review and remove broken games
3. **Avoid Duplicates**: Check if game already exists in playlist before adding
4. **Metadata Verification**: Ensure added games match playlist criteria

### Performance Considerations

1. **Batch Operations**: Add/remove multiple games in single request
2. **Lazy Loading**: Don't load full game list for playlist overview
3. **Caching**: Cache playlist metadata to reduce API calls
4. **Pagination**: For very large playlists, implement client-side pagination

### Error Handling

```javascript
async function addGameToPlaylist(playlistId, gameId) {
  try {
    const { data } = await axios.post(
      `http://localhost:3100/api/playlists/${playlistId}/games`,
      { gameIds: [gameId] }
    );
    return { success: true, data };
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, error: 'Playlist not found' };
    } else if (error.response?.status === 400) {
      return { success: false, error: 'Invalid game ID' };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}
```

---

## Playlist Data Structure

### Playlist Object

```typescript
interface Playlist {
  id: string;              // UUID
  title: string;           // Playlist name
  description?: string;    // Optional description
  author?: string;         // Creator name
  icon?: string;          // Icon filename
  library: 'arcade' | 'theatre';  // Content type
  extreme: boolean;        // Contains extreme content
  gameCount?: number;      // Number of games (list view)
  games?: Game[];         // Full game objects (detail view)
}
```

### Game Entry in Playlist

Games in playlists include:
- `id` - Game UUID
- `title` - Game name
- `developer` - Developer name
- `platformName` - Platform (Flash, HTML5, etc.)
- `releaseDate` - Release date
- `tags` - Semicolon-separated tags
- `description` - Game description

Full game details available via `GET /api/games/:id`

---

## Integration with User Favorites

While playlists are public collections, user favorites are private. Consider:

```javascript
// User favorites stored separately
const favorites = await getUserFavorites(userId);

// Create personal playlist from favorites
const { data: personalPlaylist } = await axios.post(
  'http://localhost:3100/api/playlists',
  {
    title: `${username}'s Favorites`,
    description: 'Personal favorite games',
    author: username,
    library: 'arcade'
  }
);

// Populate with favorites
await axios.post(
  `http://localhost:3100/api/playlists/${personalPlaylist.id}/games`,
  { gameIds: favorites.map(f => f.gameId) }
);
```
