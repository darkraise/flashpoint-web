# Playlists API (Flashpoint)

Manage Flashpoint's file-based playlists compatible with Flashpoint Launcher.

**Base Path:** `/api/playlists`

## Overview

This API manages **Flashpoint Playlists** - JSON files stored in the Flashpoint
Data folder. These playlists are compatible with the Flashpoint Launcher desktop
application and are shared across all users.

**Note:** For personal playlists stored in the database, see
[User Playlists API](./user-playlists-api.md).

## Flashpoint vs User Playlists

| Feature | Flashpoint Playlists (this API) | User Playlists |
|---------|--------------------------------|----------------|
| Storage | JSON files in Flashpoint Data | SQLite database (user.db) |
| Base Path | `/api/playlists` | `/api/user-playlists` |
| Ownership | Shared/Community | Per-user |
| Sharing | Public by default | Private with optional sharing |
| Compatibility | Flashpoint Launcher | Web-only |
| Persistence | Synced with Launcher | Separate from Launcher |

## List Playlists

`GET /api/playlists` - No auth required

Returns array with id, title, description, author, icon, library, extreme,
gameCount.

## Get Playlist

`GET /api/playlists/:id` - No auth required

Returns full playlist with games array (id, title, developer, platformName,
releaseDate, tags, description).

Error: `404 Not Found`

## Create Playlist

`POST /api/playlists` - Requires auth + `playlists.create` permission

Body:
`{ "title": "string (required)", "description": "string (optional)", "author": "string (optional)", "icon": "string (optional)", "library": "arcade"|"theatre" (optional), "extreme": boolean (optional) }`

Returns `201 Created` with new playlist (empty games array).

## Add Games to Playlist

`POST /api/playlists/:id/games` - Requires auth + `playlists.update` permission

Body: `{ "gameIds": ["uuid1", "uuid2", ...] }`

Returns updated playlist with games.

Error: `404 Not Found` if playlist not found

## Remove Games from Playlist

`DELETE /api/playlists/:id/games` - Requires auth + `playlists.update` permission

Body: `{ "gameIds": ["uuid1", "uuid2", ...] }`

Returns updated playlist with remaining games.

## Delete Playlist

`DELETE /api/playlists/:id` - Requires auth + `playlists.delete` permission

Returns `{ "success": true }`

## Common Workflows

### Create and Populate Playlist

```javascript
// 1. Create
const playlist = await api.post('/playlists', {
  title: 'My Favorite Platformers',
  description: 'Collection of favorites',
  author: 'john_doe',
  library: 'arcade',
});

// 2. Search for games
const results = await api.get('/games', {
  params: { tags: 'Platformer', platform: 'Flash', limit: 20 },
});

// 3. Add games
const gameIds = results.games.slice(0, 10).map((g) => g.id);
await api.post(`/playlists/${playlist.id}/games`, { gameIds });
```

### Export Playlist to JSON

```javascript
const playlist = await api.get(`/playlists/${playlistId}`);

const exported = {
  title: playlist.title,
  description: playlist.description,
  author: playlist.author,
  library: playlist.library,
  gameIds: playlist.games.map((g) => g.id),
};

// Save to file
const blob = new Blob([JSON.stringify(exported, null, 2)]);
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'playlist-export.json';
link.click();
```

### Create Playlist from Favorites

```javascript
const { gameIds } = await api.get('/favorites/game-ids');
const playlist = await api.post('/playlists', {
  title: `${username}'s Favorites`,
  description: 'Personal favorite games',
  author: username,
  library: 'arcade',
});
await api.post(`/playlists/${playlist.id}/games`, { gameIds });
```

## Best Practices

- Use descriptive playlist names
- Include detailed descriptions explaining the theme/criteria
- Separate arcade and theatre content
- Consider splitting playlists with >100 games
- Regularly review for broken or removed games
- Use batch operations (add/remove multiple at once)
- Cache playlist metadata locally to reduce API calls

## Related Documentation

- [User Playlists API](./user-playlists-api.md) - Per-user database playlists with sharing
- [Shared Playlists API](./shared-playlists-api.md) - Accessing shared user playlists
- [Community Playlists API](./community-playlists-api.md) - Download community playlists
- [Playlists & Favorites Feature](../10-features/05-playlists-favorites.md) - Feature overview
