# Playlists & Favorites

## Overview

The playlists and favorites feature allows users to organize and curate collections of games. Playlists are managed as JSON files in the Flashpoint Playlists directory, while favorites are implemented as a special hardcoded playlist. Users can create custom playlists, add/remove games, and quickly access their favorite games.

## User-Facing Functionality

### Playlists

**View All Playlists:**
- List of all available playlists
- Playlist titles, descriptions, and authors
- Game count per playlist
- Filter by library (arcade/theatre)

**View Playlist Details:**
- Full game list with metadata
- Playlist information (title, author, description)
- Add/remove games from playlist
- Play games directly from playlist
- Delete playlist

**Create Playlist:**
- Custom title and description
- Optional author name
- Library selection (arcade/theatre)
- Empty playlist created initially

**Add Games to Playlist:**
- Multi-select games from browse view
- "Add to Playlist" modal
- Select target playlist
- Prevents duplicate additions

**Remove Games from Playlist:**
- Remove button on each game in playlist
- Bulk removal (future)
- Confirmation dialog

**Delete Playlist:**
- Delete entire playlist
- Confirmation required
- Cannot delete Flashpoint default playlists (future)

### Favorites

**Add to Favorites:**
- Heart/star icon on game cards
- Quick add from game detail page
- Added to special "Favorites" playlist

**Remove from Favorites:**
- Unfavorite button
- Removed from favorites playlist

**View Favorites:**
- Dedicated favorites view
- Same layout as browse view
- Quick access from sidebar
- Favorites count displayed

**Favorites Implementation:**
- Hardcoded playlist ID: `"favorites-playlist"`
- Created automatically if doesn't exist
- Functions like a regular playlist
- Special UI treatment

## Technical Implementation

### Architecture

**Backend Components:**
- `PlaylistService`: File-based playlist management
- Playlist routes (routes/playlists.ts): REST API
- File system operations: Read/write JSON files
- GameService integration: Fetch game data

**Frontend Components:**
- `PlaylistsView`: List all playlists
- `PlaylistDetailView`: Single playlist with games
- `FavoritesView`: Favorites-specific view
- `CreatePlaylistModal`: Playlist creation dialog
- `AddToPlaylistModal`: Game addition dialog
- `usePlaylists` hook: Playlist operations
- `useFavorites` hook: Favorites management

**File Storage:**
- Location: `D:/Flashpoint/Data/Playlists/`
- Format: JSON files
- Naming: `{playlistId}.json`
- Structure: Flashpoint Playlist format

### Playlist File Format

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Favorite Puzzle Games",
  "description": "A collection of puzzle games I enjoy",
  "author": "John Doe",
  "library": "arcade",
  "icon": "",
  "games": [
    {
      "gameId": "550e8400-e29b-41d4-a716-446655440001"
    },
    {
      "gameId": "550e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

**Fields:**
- `id`: UUID for playlist (filename without .json)
- `title`: Display name
- `description`: Optional description
- `author`: Creator name
- `library`: "arcade" or "theatre"
- `icon`: Optional icon path
- `games`: Array of game objects with `gameId` property

### Database Schema

Playlists are **not** stored in the database. They are managed as JSON files in the Flashpoint Playlists directory. This maintains compatibility with the Flashpoint Launcher and allows for easy backup/sharing.

**Rationale:**
- Compatibility with Flashpoint Launcher
- Easy export/import
- Human-readable format
- No database migrations needed
- Direct file access from both apps

### API Endpoints

#### GET /api/playlists
Get all playlists.

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My Favorite Puzzle Games",
    "description": "A collection of puzzle games I enjoy",
    "author": "John Doe",
    "library": "arcade",
    "icon": "",
    "gameIds": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ]
  }
  // ... more playlists
]
```

**Errors:**
- 500: File system error

#### GET /api/playlists/:id
Get single playlist with full game data.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Favorite Puzzle Games",
  "description": "A collection of puzzle games I enjoy",
  "author": "John Doe",
  "library": "arcade",
  "icon": "",
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Puzzle Game 1",
      "platform": "Flash",
      "developer": "Developer A",
      "releaseDate": "2007-05-10",
      // ... full game object
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "Puzzle Game 2",
      "platform": "HTML5",
      "developer": "Developer B",
      "releaseDate": "2015-08-20",
      // ... full game object
    }
  ]
}
```

**Errors:**
- 404: Playlist not found

#### POST /api/playlists
Create a new playlist.

**Request Body:**
```json
{
  "title": "My New Playlist",
  "description": "Optional description",
  "author": "John Doe",
  "library": "arcade"
}
```

**Response (201 Created):**
```json
{
  "id": "generated-uuid",
  "title": "My New Playlist",
  "description": "Optional description",
  "author": "John Doe",
  "library": "arcade",
  "games": []
}
```

**Errors:**
- 400: Missing title
- 500: File system error

#### POST /api/playlists/:id/games
Add games to a playlist.

**Request Body:**
```json
{
  "gameIds": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Favorite Puzzle Games",
  "games": [
    // ... updated game list with full data
  ]
}
```

**Errors:**
- 400: Missing gameIds array
- 404: Playlist not found

#### DELETE /api/playlists/:id/games
Remove games from a playlist.

**Request Body:**
```json
{
  "gameIds": [
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Favorite Puzzle Games",
  "games": [
    // ... updated game list (removed games excluded)
  ]
}
```

**Errors:**
- 400: Missing gameIds array
- 404: Playlist not found

#### DELETE /api/playlists/:id
Delete a playlist.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Playlist deleted"
}
```

**Errors:**
- 404: Playlist not found
- 500: File system error

### File Operations

**Read Playlists:**
```typescript
async getAllPlaylists(): Promise<Playlist[]> {
  const playlistsPath = config.flashpointPlaylistsPath;
  const files = await fs.readdir(playlistsPath);

  const playlists: Playlist[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(playlistsPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const playlist = JSON.parse(content);

      // Extract game IDs
      const gameIds = Array.isArray(playlist.games)
        ? playlist.games.map((g: any) =>
            typeof g === 'string' ? g : g.gameId
          ).filter(Boolean)
        : [];

      playlists.push({
        id: playlist.id || path.basename(file, '.json'),
        title: playlist.title,
        description: playlist.description,
        author: playlist.author,
        library: playlist.library,
        icon: playlist.icon,
        gameIds
      });
    }
  }

  return playlists.sort((a, b) => a.title.localeCompare(b.title));
}
```

**Write Playlist:**
```typescript
async createPlaylist(data: CreatePlaylistDto): Promise<Playlist> {
  const playlistsPath = config.flashpointPlaylistsPath;
  const id = this.generateUUID();

  const playlist: Playlist = {
    id,
    title: data.title,
    description: data.description || '',
    author: data.author || 'Unknown',
    library: data.library || 'arcade',
    games: []
  };

  const filePath = path.join(playlistsPath, `${id}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(playlist, null, '\t'),
    'utf-8'
  );

  return playlist;
}
```

**Update Playlist:**
```typescript
async addGamesToPlaylist(
  playlistId: string,
  data: AddGamesToPlaylistDto
): Promise<Playlist | null> {
  // Read playlist file
  const playlist = await this.readPlaylistFile(playlistId);
  if (!playlist) return null;

  // Get existing game IDs
  const existingGameIds = playlist.games.map(g => g.gameId);

  // Add new games (avoid duplicates)
  const newGameIds = data.gameIds.filter(
    gameId => !existingGameIds.includes(gameId)
  );

  // Convert to playlist game format
  const newGames = newGameIds.map(gameId => ({ gameId }));

  playlist.games = [...playlist.games, ...newGames];

  // Write updated playlist
  await this.writePlaylistFile(playlistId, playlist);

  return await this.getPlaylistById(playlistId);
}
```

### Favorites Implementation

Favorites are implemented as a special playlist with a hardcoded ID:

**Favorites Playlist ID:**
```typescript
const FAVORITES_PLAYLIST_ID = "favorites-playlist";
```

**Auto-Creation:**
If the favorites playlist doesn't exist, it's created automatically on first use:

```typescript
async ensureFavoritesPlaylist(): Promise<void> {
  const exists = await this.playlistExists(FAVORITES_PLAYLIST_ID);

  if (!exists) {
    await this.createPlaylist({
      id: FAVORITES_PLAYLIST_ID,
      title: "Favorites",
      description: "Your favorite games",
      author: "System",
      library: "arcade"
    });
  }
}
```

**Add to Favorites:**
```typescript
async addToFavorites(gameId: string): Promise<void> {
  await this.ensureFavoritesPlaylist();
  await this.addGamesToPlaylist(FAVORITES_PLAYLIST_ID, {
    gameIds: [gameId]
  });
}
```

**Remove from Favorites:**
```typescript
async removeFromFavorites(gameId: string): Promise<void> {
  await this.removeGamesFromPlaylist(FAVORITES_PLAYLIST_ID, {
    gameIds: [gameId]
  });
}
```

**Check if Favorited:**
```typescript
async isFavorited(gameId: string): Promise<boolean> {
  const favorites = await this.getPlaylistById(FAVORITES_PLAYLIST_ID);
  if (!favorites) return false;

  return favorites.gameIds.includes(gameId);
}
```

## UI Components

### PlaylistsView
**Location:** `frontend/src/views/PlaylistsView.tsx`

**Features:**
- Grid of playlist cards
- Create new playlist button
- Playlist count and game count
- Click to view details
- Delete playlist action

### PlaylistDetailView
**Location:** `frontend/src/views/PlaylistDetailView.tsx`

**Features:**
- Playlist metadata display
- Game grid/list view
- Add games button
- Remove game buttons
- Play games inline
- Delete playlist button

### FavoritesView
**Location:** `frontend/src/views/FavoritesView.tsx`

**Features:**
- Same layout as browse view
- Filtered to favorites playlist only
- Quick unfavorite buttons
- Empty state for no favorites

### CreatePlaylistModal
**Location:** `frontend/src/components/playlist/CreatePlaylistModal.tsx`

**Features:**
- Title input (required)
- Description textarea
- Author input
- Library selection
- Form validation
- Success feedback

### AddToPlaylistModal
**Location:** `frontend/src/components/playlist/AddToPlaylistModal.tsx`

**Features:**
- Playlist selector dropdown
- Preview of selected games
- Duplicate detection
- Create new playlist option
- Bulk add support

## Common Use Cases

### 1. Create New Playlist
```typescript
const createMutation = useCreatePlaylist();

await createMutation.mutateAsync({
  title: "My Puzzle Games",
  description: "All my favorite puzzle games",
  author: "John Doe",
  library: "arcade"
});

// Playlist created with empty games array
```

### 2. Add Games to Playlist
```typescript
// From browse view - multi-select games
const selectedGameIds = ["game1", "game2", "game3"];

const addMutation = useAddToPlaylist();

await addMutation.mutateAsync({
  playlistId: "my-playlist-id",
  gameIds: selectedGameIds
});

// Games added to playlist
```

### 3. Add to Favorites
```typescript
// Single game card
const { addToFavorites, isFavorited } = useFavorites();

const handleFavorite = async () => {
  if (isFavorited(gameId)) {
    await removeFromFavorites(gameId);
  } else {
    await addToFavorites(gameId);
  }
};

// Heart icon toggles favorited state
```

### 4. View Playlist Details
```typescript
// Navigate to playlist detail
const navigate = useNavigate();
navigate(`/playlists/${playlistId}`);

// Loads playlist with full game data
const { data: playlist } = usePlaylist(playlistId);

// Displays games in grid/list view
```

### 5. Remove Game from Playlist
```typescript
const removeMutation = useRemoveFromPlaylist();

await removeMutation.mutateAsync({
  playlistId: "my-playlist-id",
  gameIds: [gameIdToRemove]
});

// Game removed from playlist
// UI updates automatically via query invalidation
```

### 6. Delete Playlist
```typescript
const deleteMutation = useDeletePlaylist();

// Show confirmation dialog
if (confirm("Delete this playlist?")) {
  await deleteMutation.mutateAsync(playlistId);
  // Redirect to playlists list
  navigate("/playlists");
}
```

## Permissions

Playlist operations require the following permissions:

- `playlists.read` - View playlists and their contents
- `playlists.create` - Create new playlists
- `playlists.update` - Add/remove games from playlists
- `playlists.delete` - Delete playlists

**Default Permission Assignments:**
- **Admin:** All playlist permissions
- **User:** All playlist permissions
- **Guest:** Read-only (playlists.read)

## State Management

**Query Caching (TanStack Query):**
```typescript
// List all playlists
const { data: playlists } = useQuery({
  queryKey: ['playlists'],
  queryFn: () => api.get('/playlists').then(res => res.data)
});

// Single playlist with games
const { data: playlist } = useQuery({
  queryKey: ['playlists', playlistId],
  queryFn: () => api.get(`/playlists/${playlistId}`).then(res => res.data)
});
```

**Query Invalidation:**
```typescript
// After adding games
queryClient.invalidateQueries({ queryKey: ['playlists', playlistId] });
queryClient.invalidateQueries({ queryKey: ['playlists'] });

// After creating playlist
queryClient.invalidateQueries({ queryKey: ['playlists'] });
```

**Optimistic Updates:**
```typescript
const addToPlaylistMutation = useMutation({
  mutationFn: ({ playlistId, gameIds }) =>
    api.post(`/playlists/${playlistId}/games`, { gameIds }),
  onMutate: async ({ playlistId, gameIds }) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({ queryKey: ['playlists', playlistId] });

    // Snapshot previous value
    const previousPlaylist = queryClient.getQueryData(['playlists', playlistId]);

    // Optimistically update cache
    queryClient.setQueryData(['playlists', playlistId], old => ({
      ...old,
      gameIds: [...old.gameIds, ...gameIds]
    }));

    return { previousPlaylist };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(
      ['playlists', variables.playlistId],
      context.previousPlaylist
    );
  },
  onSettled: (data, error, variables) => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['playlists', variables.playlistId] });
  }
});
```

## Best Practices

1. **Always validate playlist exists** before operations
2. **Prevent duplicate games** in playlist
3. **Use optimistic updates** for better UX
4. **Handle file system errors** gracefully
5. **Show loading states** during operations
6. **Confirm destructive actions** (delete)
7. **Cache playlist data** with TanStack Query
8. **Invalidate queries** after mutations
9. **Backup playlist files** regularly
10. **Use meaningful playlist IDs** (UUIDs)

## Troubleshooting

### Playlist not found
- Verify playlistId is correct
- Check if JSON file exists in Playlists directory
- Ensure file is valid JSON
- Check file permissions

### Duplicate games in playlist
- Verify duplicate detection logic
- Check gameId format consistency
- Ensure proper filtering on add

### File write errors
- Check directory permissions
- Verify disk space available
- Ensure Flashpoint path is correct
- Check for file locks (Launcher open?)

### Favorites not persisting
- Verify favorites-playlist.json exists
- Check hardcoded playlist ID matches
- Ensure proper API calls
- Check network tab for errors

## Future Enhancements

- Playlist sharing (export/import)
- Playlist thumbnails/icons
- Playlist ordering/sorting within list
- Nested playlists/folders
- Smart playlists (auto-populated by rules)
- Playlist collaboration (multi-user)
- Playlist history/versioning
- Playlist statistics (most played)
- Playlist recommendations
- Bulk playlist operations
- Playlist search
- Playlist tags/categories
- Playlist duplication
- Playlist merging
- Community playlists (shared repository)
