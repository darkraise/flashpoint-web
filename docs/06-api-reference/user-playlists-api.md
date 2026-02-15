# User Playlists API

Manage user-created playlists stored in the application database. These are
separate from Flashpoint's file-based playlists.

**Base Path:** `/api/user-playlists`

**Authentication:** Required (JWT Bearer token)

**Feature Flag:** Requires `enablePlaylists` feature to be enabled

**Rate Limiting:** Standard rate limiting applied

## Playlist vs User Playlist

| Feature | Flashpoint Playlists (`/api/playlists`) | User Playlists (`/api/user-playlists`) |
|---------|----------------------------------------|---------------------------------------|
| Storage | JSON files in Flashpoint Data folder | SQLite database (user.db) |
| Ownership | Shared/Community | Per-user |
| Sharing | Public by default | Private with optional sharing |
| Game Order | Manual ordering supported | Manual ordering supported |
| Integration | Compatible with Flashpoint Launcher | Web-only |

## List User Playlists

`GET /api/user-playlists` - Requires auth + `playlists.read` permission

Returns paginated list of the authenticated user's playlists.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (min: 1) |
| limit | number | 50 | Items per page (min: 1, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "My Favorites",
      "description": "Best games",
      "icon": "star",
      "gameCount": 15,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-20T14:30:00.000Z",
      "shareToken": null,
      "shareExpiresAt": null,
      "showOwner": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

## Get Playlist Statistics

`GET /api/user-playlists/stats` - Requires auth + `playlists.read` permission

Returns statistics about the user's playlists.

**Response:**

```json
{
  "totalPlaylists": 5,
  "totalGames": 127,
  "sharedPlaylists": 2
}
```

## Get Single Playlist

`GET /api/user-playlists/:id` - Requires auth + `playlists.read` permission

Returns a single playlist by ID (must be owned by the authenticated user).

**Response:**

```json
{
  "id": 1,
  "title": "My Favorites",
  "description": "Best games",
  "icon": "star",
  "gameCount": 15,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-20T14:30:00.000Z",
  "shareToken": "abc123...",
  "shareExpiresAt": "2024-02-15T00:00:00.000Z",
  "showOwner": true
}
```

**Errors:**

- `400 Bad Request` - Invalid playlist ID
- `404 Not Found` - Playlist not found or not owned by user

## Get Playlist Games

`GET /api/user-playlists/:id/games` - Requires auth + `playlists.read` permission

Returns all games in a playlist with full game data.

**Response:**

```json
[
  {
    "id": "game-uuid-1",
    "title": "Super Game",
    "developer": "Dev Studio",
    "publisher": "Publisher Inc",
    "platformName": "Flash",
    "releaseDate": "2005-01-15",
    "orderIndex": 0
  }
]
```

## Create Playlist

`POST /api/user-playlists` - Requires auth + `playlists.create` permission

Creates a new playlist for the authenticated user.

**Request Body:**

```json
{
  "title": "My New Playlist",
  "description": "Optional description (max 2000 chars)",
  "icon": "star"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | Yes | 1-255 characters |
| description | string | No | Max 2000 characters |
| icon | string | No | Max 100 characters |

**Response:** `201 Created`

```json
{
  "id": 2,
  "title": "My New Playlist",
  "description": "Optional description",
  "icon": "star",
  "gameCount": 0,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:00:00.000Z",
  "shareToken": null,
  "shareExpiresAt": null,
  "showOwner": false
}
```

## Update Playlist

`PATCH /api/user-playlists/:id` - Requires auth + `playlists.update` permission

Updates playlist metadata (title, description, icon).

**Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "icon": "heart"
}
```

All fields are optional. Only provided fields are updated.

**Response:** Updated playlist object

**Errors:**

- `400 Bad Request` - Invalid playlist ID or validation error
- `404 Not Found` - Playlist not found or not owned by user

## Delete Playlist

`DELETE /api/user-playlists/:id` - Requires auth + `playlists.delete` permission

Permanently deletes a playlist and all its game associations.

**Response:** `204 No Content`

**Errors:**

- `400 Bad Request` - Invalid playlist ID
- `404 Not Found` - Playlist not found or not owned by user

## Add Games to Playlist

`POST /api/user-playlists/:id/games` - Requires auth + `playlists.update` permission

Adds one or more games to a playlist.

**Request Body:**

```json
{
  "gameIds": ["game-uuid-1", "game-uuid-2", "game-uuid-3"]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| gameIds | string[] | Yes | 1-100 game UUIDs |

**Response:** Updated playlist with games array

## Remove Games from Playlist

`DELETE /api/user-playlists/:id/games` - Requires auth + `playlists.update` permission

Removes one or more games from a playlist.

**Request Body:**

```json
{
  "gameIds": ["game-uuid-1", "game-uuid-2"]
}
```

**Response:** Updated playlist with remaining games

## Reorder Games

`PUT /api/user-playlists/:id/games/reorder` - Requires auth + `playlists.update` permission

Sets the order of games in a playlist.

**Request Body:**

```json
{
  "gameIdOrder": ["game-uuid-3", "game-uuid-1", "game-uuid-2"]
}
```

The array should contain all game IDs in the desired order.

**Response:** Updated playlist with reordered games

## Copy Flashpoint Playlist

`POST /api/user-playlists/copy-flashpoint` - Requires auth + `playlists.create` permission

Copies a Flashpoint (file-based) playlist to a user playlist.

**Request Body:**

```json
{
  "flashpointPlaylistId": "uuid-of-flashpoint-playlist",
  "newTitle": "Optional new title"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| flashpointPlaylistId | string (UUID) | Yes | ID of Flashpoint playlist to copy |
| newTitle | string | No | Title for new playlist (defaults to original) |

**Response:** `201 Created` - New user playlist with copied games

**Errors:**

- `404 Not Found` - Flashpoint playlist not found

## Sharing Endpoints

### Enable Sharing

`POST /api/user-playlists/:id/share/enable` - Requires auth + `playlists.update` permission

Generates a share token for the playlist.

**Request Body:**

```json
{
  "expiresAt": "2024-02-15T00:00:00.000Z",
  "showOwner": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| expiresAt | string (ISO datetime) | No | Expiration date (null = never expires) |
| showOwner | boolean | No | Show owner name on shared page |

**Response:**

```json
{
  "shareToken": "generated-token-string",
  "shareUrl": "/shared/playlist/generated-token-string",
  "expiresAt": "2024-02-15T00:00:00.000Z",
  "showOwner": true
}
```

### Disable Sharing

`POST /api/user-playlists/:id/share/disable` - Requires auth + `playlists.update` permission

Removes the share token and disables sharing.

**Response:**

```json
{
  "success": true
}
```

### Regenerate Share Token

`POST /api/user-playlists/:id/share/regenerate` - Requires auth + `playlists.update` permission

Generates a new share token, invalidating the old one.

**Response:** Same as Enable Sharing

### Update Share Settings

`PATCH /api/user-playlists/:id/share/settings` - Requires auth + `playlists.update` permission

Updates sharing settings without regenerating the token.

**Request Body:**

```json
{
  "expiresAt": "2024-03-15T00:00:00.000Z",
  "showOwner": false
}
```

**Response:** Updated share data

## Common Workflows

### Create and Populate a Playlist

```javascript
// 1. Create playlist
const playlist = await api.post('/user-playlists', {
  title: 'Best Flash Games',
  description: 'My favorite Flash games',
  icon: 'flash'
});

// 2. Search for games
const results = await api.get('/games', {
  params: { platform: 'Flash', limit: 50 }
});

// 3. Add games
await api.post(`/user-playlists/${playlist.id}/games`, {
  gameIds: results.data.games.slice(0, 10).map(g => g.id)
});
```

### Share a Playlist

```javascript
// 1. Enable sharing with 30-day expiration
const shareData = await api.post(`/user-playlists/${playlistId}/share/enable`, {
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  showOwner: true
});

// 2. Share the URL
console.log(`Share this link: ${window.location.origin}${shareData.shareUrl}`);

// 3. Later, update to never expire
await api.patch(`/user-playlists/${playlistId}/share/settings`, {
  expiresAt: null
});
```

### Import from Flashpoint

```javascript
// Get Flashpoint playlists
const flashpointPlaylists = await api.get('/playlists');

// Copy one to user playlists
const userPlaylist = await api.post('/user-playlists/copy-flashpoint', {
  flashpointPlaylistId: flashpointPlaylists.data[0].id,
  newTitle: 'My Copy of ' + flashpointPlaylists.data[0].title
});
```

## Related Documentation

- [Playlists API](./playlists-api.md) - Flashpoint file-based playlists
- [Shared Playlists API](./shared-playlists-api.md) - Accessing shared playlists
- [Playlists & Favorites Feature](../10-features/05-playlists-favorites.md) - Feature overview
