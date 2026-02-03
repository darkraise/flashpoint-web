# Playlists & Favorites

## Overview

Playlists are JSON files stored in the Flashpoint Playlists directory for organizing games. Favorites are database-driven per-user favorites stored in the `user_favorites` table. Both features allow users to curate game collections.

## Architecture

**Backend Components:**
- `PlaylistService`: File-based playlist management
- `FavoritesService`: Database-driven favorites management
- Playlist routes (routes/playlists.ts): REST API for playlists
- Favorites routes (routes/favorites.ts): REST API for favorites

**Frontend Components:**
- `PlaylistsView`: List all playlists
- `PlaylistDetailView`: Single playlist with games
- `FavoritesView`: Favorites-specific view
- `CreatePlaylistModal`: Playlist creation dialog
- `usePlaylists` hook: Playlist operations
- `useFavorites` hook: Favorites management

## Playlist File Format

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Favorite Puzzle Games",
  "description": "A collection of puzzle games I enjoy",
  "author": "John Doe",
  "library": "arcade",
  "icon": "",
  "games": [
    { "gameId": "550e8400-e29b-41d4-a716-446655440001" }
  ]
}
```

**Location:** `D:/Flashpoint/Data/Playlists/`

## Database Schema

**Playlists:**
Stored as JSON files in Flashpoint directory. NOT in database. This maintains compatibility with Flashpoint Launcher.

**Favorites:**
```sql
CREATE TABLE user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

#### GET /api/playlists
Get all playlists.
- **Response:** Array of playlist summaries with game IDs

#### GET /api/playlists/:id
Get single playlist with full game data.
- **Response:** Playlist with games array containing full game metadata

#### POST /api/playlists
Create a new playlist.
- **Body:** `{ "title", "description", "author", "library" }`
- **Response:** Created playlist (201)

#### POST /api/playlists/:id/games
Add games to a playlist.
- **Body:** `{ "gameIds": [...] }`
- **Response:** Updated playlist with full game data

#### DELETE /api/playlists/:id/games
Remove games from a playlist.
- **Body:** `{ "gameIds": [...] }`
- **Response:** Updated playlist

#### DELETE /api/playlists/:id
Delete a playlist.
- **Response:** `{ "success": true }`

#### Favorites API Endpoints

Complete documentation: [Favorites API](../../06-api-reference/favorites-api.md)

**Key Endpoints:**
- `GET /api/favorites` - Get user's favorites
- `GET /api/favorites/games` - Get favorites with full game data
- `POST /api/favorites` - Add game to favorites
- `POST /api/favorites/toggle` - Toggle favorite status
- `DELETE /api/favorites/:gameId` - Remove from favorites
- `POST /api/favorites/batch` - Batch add favorites
- `DELETE /api/favorites` - Clear all favorites

## Favorites Implementation

```typescript
// Add to Favorites
addFavorite(userId: number, gameId: string): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO user_favorites (user_id, game_id)
    VALUES (?, ?)
  `);
  return stmt.run(userId, gameId).changes > 0;
}

// Toggle Favorite Status
toggleFavorite(userId: number, gameId: string): { isFavorited: boolean } {
  if (this.isFavorited(userId, gameId)) {
    this.removeFavorite(userId, gameId);
    return { isFavorited: false };
  } else {
    this.addFavorite(userId, gameId);
    return { isFavorited: true };
  }
}
```

## Permissions

**Playlist Permissions:**
- `playlists.read` - View playlists
- `playlists.create` - Create new playlists
- `playlists.update` - Add/remove games
- `playlists.delete` - Delete playlists

**Favorites Permissions:**
- `playlists.read` - View favorites
- `playlists.create` - Add games to favorites
- `playlists.delete` - Remove games from favorites

**Default Assignments:**
- **Admin:** All permissions
- **User:** All permissions
- **Guest:** Read-only (playlists.read)

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
```

### 2. Add Games to Playlist
```typescript
const addMutation = useAddToPlaylist();

await addMutation.mutateAsync({
  playlistId: "my-playlist-id",
  gameIds: ["game1", "game2", "game3"]
});
```

### 3. Toggle Favorite
```typescript
const { data } = await api.post('/favorites/toggle', { gameId });
// isFavorited is now true or false
```

### 4. Get Favorites with Full Data
```typescript
const { data: favorites } = useQuery({
  queryKey: ['favorites-games'],
  queryFn: () => api.get('/favorites/games').then(res => res.data)
});
```

## Best Practices

1. Always validate playlist exists before operations
2. Prevent duplicate games in playlist
3. Use optimistic updates for better UX
4. Handle file system errors gracefully
5. Show loading states during operations
6. Confirm destructive actions (delete)
7. Cache playlist data with TanStack Query
8. Invalidate queries after mutations
9. Backup playlist files regularly
10. Use meaningful playlist IDs (UUIDs)

## Troubleshooting

**Playlist not found:**
- Verify playlistId is correct
- Check if JSON file exists in Playlists directory
- Ensure file is valid JSON
- Check file permissions

**Duplicate games in playlist:**
- Verify duplicate detection logic
- Check gameId format consistency
- Ensure proper filtering on add

**Favorites not persisting:**
- Verify database migrations ran successfully
- Check user_favorites table exists in user.db
- Ensure user is authenticated
- Check `enableFavorites` feature flag is enabled
- Review backend logs for database errors

**File write errors:**
- Check directory permissions
- Verify disk space available
- Ensure Flashpoint path is correct
