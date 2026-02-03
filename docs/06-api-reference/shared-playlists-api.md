# Shared & Community Playlists API

## Shared Playlists

### Get Shared Playlist Metadata

`GET /api/playlists/shared/:shareToken` - No auth required

Returns id, title, description, icon (base64), gameCount, createdAt, updatedAt, ownerUsername (if enabled).

Error: `404 Not Found` or `410 Gone` (if revoked).

### Get Games in Shared Playlist

`GET /api/playlists/shared/:shareToken/games` - No auth required

Returns array of game objects with id, title, platform, developer, publisher, releaseDate, thumbnail, launchCommand.

### Validate Game in Shared Playlist

`GET /api/playlists/shared/:shareToken/games/:gameId/validate` - No auth required

Returns `{ "valid": true|false }`

### Generate Temporary Access Token

`POST /api/playlists/shared/:shareToken/generate-access-token` - No auth required

Returns `{ "accessToken": "jwt...", "expiresIn": 3600, "playlistId": 42 }`

Token valid for 60 minutes.

### Clone Shared Playlist to User Account

`POST /api/playlists/shared/:shareToken/clone` - Requires `playlists.create` permission

Body (optional): `{ "newTitle": "My Retro Games Collection" }`

Returns `201 Created` with cloned playlist details. Original playlist not modified.

## Community Playlists

### List Community Playlists

`GET /api/community-playlists` - Optional auth

Returns categories array with name and playlists (fetched from official Flashpoint wiki). Cached 24 hours.

```json
{
  "categories": [
    {
      "name": "Platformers",
      "playlists": [
        {
          "id": "id-1",
          "title": "Classic Platformers",
          "description": "...",
          "icon": "https://...",
          "gameCount": 42,
          "downloadUrl": "https://wiki.../playlists/platformers.json",
          "creator": "Community Curators",
          "lastUpdated": "2024-01-20T12:00:00Z"
        }
      ]
    }
  ]
}
```

### Download Community Playlist

`POST /api/community-playlists/download` - Optional auth

Body: `{ "downloadUrl": "https://..." }`

Returns `201 Created` with playlist details. Authenticated users save to account; anonymous users get in-memory response.

## Game Downloads

### Start Game Download

`POST /api/games/:id/download` - Requires `games.download` permission

Body (optional): `{ "gameDataId": 12345 }`

Returns `202 Accepted` with gameDataId and sha256 hash.

Error: `409 Conflict` if already downloading or exists.

### Monitor Download Progress (SSE)

`GET /api/games/:id/download/progress` - Requires `games.download` permission

Server-sent events with events: `progress` (percent, status: downloading|validating|importing), `complete`, `error`.

```javascript
const eventSource = new EventSource('/api/games/game-123/download/progress');

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  updateProgressBar(data.percent); // 0-100
});

eventSource.addEventListener('complete', () => {
  eventSource.close();
});
```

### Cancel Download

`DELETE /api/games/:id/download` - Requires `games.download` permission

Returns `{ "success": true, "cancelled": true }`

## Rate Limiting

- Shared playlist reads: 10 req/min per IP
- Token generation: 10 req/min per IP
- Playlist cloning: 5 req/min per user
- Community downloads: 5 req/min per user

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Responses

All follow format: `{ "error": "Type", "message": "...", "code": "CODE", "statusCode": 400 }`

Common codes:

- `400 INVALID_REQUEST` - Malformed request
- `401 UNAUTHORIZED` - Auth required
- `403 FORBIDDEN` - Insufficient permissions
- `404 NOT_FOUND` - Resource not found
- `410 GONE` - Link revoked
- `429 RATE_LIMIT_EXCEEDED` - Too many requests
