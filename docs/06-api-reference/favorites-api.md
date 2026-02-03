# Favorites API

Manage user game favorites (personal curated collections).

**Feature Flag:** `enableFavorites` - Requires feature flag in system settings.

## Get All Favorites

`GET /api/favorites` - Requires `playlists.read` permission

Query params: `limit` (default: no limit, max 1000), `offset` (default: 0)

Returns array of favorite objects with id, userId, gameId, addedAt.

## Get Favorite Game IDs

`GET /api/favorites/game-ids` - Requires `playlists.read` permission

Returns `{ "gameIds": ["uuid1", "uuid2", ...] }` for quick checks.

## Get Favorites with Full Game Data

`GET /api/favorites/games` - Requires `playlists.read` permission

Query params: `limit`, `offset`, `sortBy` (title|dateAdded, default: dateAdded), `sortOrder` (asc|desc, default: desc)

Returns array of game objects with full metadata including addedAt timestamp.

## Get Favorites Statistics

`GET /api/favorites/stats` - Requires `playlists.read` permission

```json
{
  "totalFavorites": 47,
  "oldestFavoriteDate": "2024-06-15T08:20:00Z",
  "newestFavoriteDate": "2025-02-01T10:30:00Z"
}
```

## Toggle Favorite Status

`POST /api/favorites/toggle` - Requires `playlists.create` permission

Body: `{ "gameId": "uuid" }`

Returns `{ "isFavorited": true|false }`

## Add Game to Favorites

`POST /api/favorites` - Requires `playlists.create` permission

Body: `{ "gameId": "uuid" }`

Returns `201 Created` if new, `200 OK` if already favorited.

## Remove Game from Favorites

`DELETE /api/favorites/:gameId` - Requires `playlists.delete` permission

Returns `204 No Content`

## Batch Add Favorites

`POST /api/favorites/batch` - Requires `playlists.create` permission

Body: `{ "gameIds": ["uuid1", "uuid2", ...] }` (1-1000 games)

Returns `{ "added": 3 }`

## Batch Remove Favorites

`DELETE /api/favorites/batch` - Requires `playlists.delete` permission

Body: `{ "gameIds": ["uuid1", "uuid2", ...] }`

Returns `{ "removed": 2 }`

## Clear All Favorites

`DELETE /api/favorites` - Requires `playlists.delete` permission

Returns `{ "removed": 47 }`

## Usage Examples

### Check if game is favorited
```javascript
const { gameIds } = await api.get('/favorites/game-ids');
const isFavorited = gameIds.includes(gameId);
```

### Batch operations (efficient)
```javascript
// Adding 5 games = 1 rate limit unit
await api.post('/favorites/batch', { gameIds: [1,2,3,4,5] });

// Adding 5 individually = 5 rate limit units (inefficient)
for (const id of [1,2,3,4,5]) {
  await api.post('/favorites', { gameId: id });
}
```

### Create playlist from favorites
```javascript
const { gameIds } = await api.get('/favorites/game-ids');
const playlist = await api.post('/playlists', { title: 'My Favorites' });
await api.post(`/playlists/${playlist.id}/games`, { gameIds });
```

## Error Responses

- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Favorite not found (single delete only)
- `503 Service Unavailable` - Feature disabled or maintenance mode

## Permission Matrix

| Endpoint | Method | Required Permission |
|----------|--------|-------------------|
| `/api/favorites` | GET | `playlists.read` |
| `/api/favorites/game-ids` | GET | `playlists.read` |
| `/api/favorites/games` | GET | `playlists.read` |
| `/api/favorites/stats` | GET | `playlists.read` |
| `/api/favorites/toggle` | POST | `playlists.create` |
| `/api/favorites` | POST | `playlists.create` |
| `/api/favorites/:gameId` | DELETE | `playlists.delete` |
| `/api/favorites/batch` | POST | `playlists.create` |
| `/api/favorites/batch` | DELETE | `playlists.delete` |
| `/api/favorites` | DELETE | `playlists.delete` |

## Rate Limiting

Subject to global rate limit (default: 100 requests per 15 minutes). Batch operations count as single request for efficiency.
