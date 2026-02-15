# Playlists & Favorites

## Overview

Flashpoint Web provides three systems for organizing games:

1. **Flashpoint Playlists** - JSON files compatible with Flashpoint Launcher
2. **User Playlists** - Database-driven per-user playlists with sharing
3. **Favorites** - Quick per-user favorites list

## Playlist Systems Comparison

| Feature | Flashpoint Playlists | User Playlists | Favorites |
|---------|---------------------|----------------|-----------|
| Storage | JSON files | SQLite (user.db) | SQLite (user.db) |
| Scope | Shared/Community | Per-user | Per-user |
| Sharing | Public by default | Token-based sharing | Not shareable |
| Launcher Compatible | Yes | No | No |
| API Path | `/api/playlists` | `/api/user-playlists` | `/api/favorites` |
| Game Order | Manual ordering | Manual ordering | By date added |
| Metadata | Title, author, icon | Title, description, icon | None |

## Architecture

**Backend Components:**

- `PlaylistService`: Flashpoint file-based playlist management
- `UserPlaylistService`: Database-driven user playlist management
- `FavoritesService`: Database-driven favorites management
- `routes/playlists.ts`: Flashpoint playlists REST API
- `routes/user-playlists.ts`: User playlists REST API with sharing
- `routes/shared-playlists.ts`: Public access to shared playlists
- `routes/favorites.ts`: REST API for favorites

**Frontend Components:**

- `PlaylistsView`: List all Flashpoint playlists
- `UserPlaylistsView`: List user's personal playlists
- `PlaylistDetailView`: Single playlist with games
- `SharedPlaylistView`: View shared playlist (no auth required)
- `FavoritesView`: Favorites-specific view
- `CreatePlaylistModal`: Playlist creation dialog
- `usePlaylists` hook: Flashpoint playlist operations
- `useUserPlaylists` hook: User playlist operations
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
  "games": [{ "gameId": "550e8400-e29b-41d4-a716-446655440001" }]
}
```

**Location:** `D:/Flashpoint/Data/Playlists/`

## User Playlists

User playlists are stored in the application database and support:

- **Per-user ownership** - Each playlist belongs to a specific user
- **Privacy** - Playlists are private by default
- **Sharing** - Generate share tokens with optional expiration
- **Cloning** - Clone from Flashpoint playlists or shared playlists

### User Playlist Sharing

Share tokens allow public access without authentication:

```javascript
// Enable sharing
const { shareToken, shareUrl } = await api.post(
  `/user-playlists/${id}/share/enable`,
  { expiresAt: '2024-12-31T23:59:59Z', showOwner: true }
);

// Disable sharing
await api.post(`/user-playlists/${id}/share/disable`);

// Regenerate token (invalidates old links)
const { shareToken: newToken } = await api.post(
  `/user-playlists/${id}/share/regenerate`
);
```

### Copying Between Systems

```javascript
// Copy Flashpoint playlist to User playlist
await api.post('/user-playlists/copy-flashpoint', {
  flashpointPlaylistId: 'flashpoint-uuid',
  newTitle: 'My Copy'
});

// Clone shared User playlist to own collection
await api.post(`/shared-playlists/${shareToken}/clone`, {
  newTitle: 'Cloned Playlist'
});
```

## Database Schema

**Flashpoint Playlists:** Stored as JSON files in Flashpoint directory. NOT in
database. This maintains compatibility with Flashpoint Launcher.

**User Playlists:**

```sql
CREATE TABLE user_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMP,
  show_owner INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_playlist_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, game_id),
  FOREIGN KEY(playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
);
```

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

### User Playlists API Endpoints

Complete documentation: [User Playlists API](../06-api-reference/user-playlists-api.md)

**Key Endpoints:**

- `GET /api/user-playlists` - Get user's playlists
- `POST /api/user-playlists` - Create playlist
- `GET /api/user-playlists/:id` - Get single playlist
- `PATCH /api/user-playlists/:id` - Update playlist
- `DELETE /api/user-playlists/:id` - Delete playlist
- `POST /api/user-playlists/:id/games` - Add games
- `DELETE /api/user-playlists/:id/games` - Remove games
- `POST /api/user-playlists/:id/share/enable` - Enable sharing
- `POST /api/user-playlists/:id/share/disable` - Disable sharing
- `POST /api/user-playlists/copy-flashpoint` - Copy from Flashpoint playlist

### Shared Playlists API Endpoints

Complete documentation: [Shared Playlists API](../06-api-reference/shared-playlists-api.md)

**Key Endpoints (no auth required except clone):**

- `GET /api/shared-playlists/:shareToken` - Get shared playlist
- `GET /api/shared-playlists/:shareToken/games` - Get games
- `POST /api/shared-playlists/:shareToken/generate-access-token` - Get temp token
- `POST /api/shared-playlists/:shareToken/clone` - Clone to user's collection

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
  title: 'My Puzzle Games',
  description: 'All my favorite puzzle games',
  author: 'John Doe',
  library: 'arcade',
});
```

### 2. Add Games to Playlist

```typescript
const addMutation = useAddToPlaylist();

await addMutation.mutateAsync({
  playlistId: 'my-playlist-id',
  gameIds: ['game1', 'game2', 'game3'],
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
  queryFn: () => api.get('/favorites/games').then((res) => res.data),
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
