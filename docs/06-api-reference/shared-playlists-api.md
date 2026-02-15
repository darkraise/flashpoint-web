# Shared Playlists API

Access playlists shared via share tokens without authentication.

**Base Path:** `/api/shared-playlists`

**Authentication:** Not required (except for cloning)

**Rate Limiting:** Strict rate limiting applied to prevent abuse

## Overview

The Shared Playlists API allows anonymous access to playlists that have been shared
via a share token. Users with the share token can view the playlist, see its games,
generate temporary access tokens for playing games, and clone the playlist to their
own collection.

## Get Shared Playlist

`GET /api/shared-playlists/:shareToken` - No auth required

Returns playlist details for a valid share token.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| shareToken | string | Share token for the playlist |

**Response:**

```json
{
  "id": 1,
  "title": "Best Flash Games",
  "description": "A curated collection of classic Flash games",
  "icon": "star",
  "gameCount": 25,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-20T14:30:00.000Z",
  "ownerUsername": "john_doe"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | number | Playlist ID |
| title | string | Playlist title |
| description | string | Playlist description (may be null) |
| icon | string | Playlist icon (may be null) |
| gameCount | number | Number of games in playlist |
| createdAt | string (ISO) | Creation timestamp |
| updatedAt | string (ISO) | Last update timestamp |
| ownerUsername | string | Owner's username (only if `showOwner` is enabled) |

**Errors:**

| Status | Description |
|--------|-------------|
| `404 Not Found` | Invalid or expired share token |

## Get Shared Playlist Games

`GET /api/shared-playlists/:shareToken/games` - No auth required

Returns all games in the shared playlist.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| shareToken | string | Share token for the playlist |

**Response:**

```json
[
  {
    "id": "game-uuid-1",
    "title": "Super Mario Flash",
    "developer": "Pouetpu",
    "publisher": null,
    "platformName": "Flash",
    "releaseDate": "2006-04-15",
    "tagsStr": "Platformer;Action",
    "orderIndex": 0
  },
  {
    "id": "game-uuid-2",
    "title": "Interactive Buddy",
    "developer": "Shock Value",
    "publisher": null,
    "platformName": "Flash",
    "releaseDate": "2005-01-01",
    "tagsStr": "Sandbox;Violence",
    "orderIndex": 1
  }
]
```

**Game Fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Game ID |
| title | string | Game title |
| developer | string | Developer name |
| publisher | string | Publisher name (may be null) |
| platformName | string | Platform (Flash, HTML5, etc.) |
| releaseDate | string | Release date (YYYY-MM-DD) |
| tagsStr | string | Semicolon-separated tags |
| orderIndex | number | Position in playlist |

**Errors:**

| Status | Description |
|--------|-------------|
| `404 Not Found` | Invalid or expired share token |

## Validate Game Access

`GET /api/shared-playlists/:shareToken/games/:gameId/validate` - No auth required

Validates whether a specific game is part of the shared playlist. Used to authorize
game access for unauthenticated users viewing shared playlists.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| shareToken | string | Share token for the playlist |
| gameId | string (UUID) | Game ID to validate |

**Response:**

```json
{
  "valid": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| valid | boolean | Whether the game is in the playlist |

## Generate Access Token

`POST /api/shared-playlists/:shareToken/generate-access-token` - No auth required

Generates a temporary access token for playing games from the shared playlist.
This token can be used to authenticate game content requests for unauthenticated
users who are viewing a shared playlist.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| shareToken | string | Share token for the playlist |

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "playlistId": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string (JWT) | Temporary access token |
| expiresIn | number | Token lifetime in seconds (60 minutes) |
| playlistId | number | Playlist ID the token is scoped to |

**Usage:**

The access token should be included in subsequent requests to game content
endpoints (`/game-proxy/*`, `/game-zip/*`) to authorize access without a user
login.

## Clone Shared Playlist

`POST /api/shared-playlists/:shareToken/clone` - Requires auth + `playlists.create` permission

Clones the shared playlist to the authenticated user's collection.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| shareToken | string | Share token for the playlist |

**Request Body:**

```json
{
  "newTitle": "My Copy of Best Flash Games"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| newTitle | string | No | Title for cloned playlist (1-255 chars, defaults to original) |

**Response:** `201 Created`

```json
{
  "id": 5,
  "title": "My Copy of Best Flash Games",
  "description": "A curated collection of classic Flash games",
  "icon": "star",
  "gameCount": 25,
  "createdAt": "2024-01-25T10:00:00.000Z",
  "updatedAt": "2024-01-25T10:00:00.000Z",
  "shareToken": null,
  "shareExpiresAt": null,
  "showOwner": false
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid title or unable to clone |
| `401 Unauthorized` | Not authenticated |
| `403 Forbidden` | Missing `playlists.create` permission |
| `404 Not Found` | Invalid or expired share token |

## Share Token Lifecycle

```
1. Owner enables sharing → Share token generated
   ↓
2. Owner shares URL with others
   ↓
3. Recipients access via share token
   ↓
4. Owner can:
   - Update share settings (expiration, showOwner)
   - Regenerate token (invalidates old URL)
   - Disable sharing (invalidates token)
```

## Rate Limiting

| Endpoint | Limit | Description |
|----------|-------|-------------|
| `GET /:shareToken` | 10 req/min per IP | Playlist metadata |
| `GET /:shareToken/games` | 10 req/min per IP | Game list |
| `POST /generate-access-token` | 10 req/min per IP | Token generation |
| `POST /clone` | 5 req/min per user | Playlist cloning |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Security Considerations

- **Rate Limiting:** Strict rate limits prevent brute-force token guessing
- **Token Validation:** Middleware validates token before each request
- **Expiration:** Share tokens can have expiration dates
- **Scoped Access:** Access tokens are scoped to specific playlists
- **No Sensitive Data:** Share token responses exclude userId and internal fields
- **Optional Attribution:** Owner visibility is controlled by `showOwner` setting

## Example Workflow

```javascript
// 1. Access shared playlist (no auth needed)
const playlist = await fetch(`/api/shared-playlists/${shareToken}`).then(r => r.json());
console.log(`${playlist.title} - ${playlist.gameCount} games`);

// 2. Get games in the playlist
const games = await fetch(`/api/shared-playlists/${shareToken}/games`).then(r => r.json());

// 3. Generate access token for playing games
const { accessToken } = await fetch(`/api/shared-playlists/${shareToken}/generate-access-token`, {
  method: 'POST'
}).then(r => r.json());

// 4. Use access token for game content requests
const gameContent = await fetch(`/game-proxy/${games[0].launchCommand}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 5. Clone to own collection (requires auth)
const cloned = await api.post(`/shared-playlists/${shareToken}/clone`, {
  newTitle: 'My Copy'
});
```

## Frontend Route

The frontend handles shared playlists at:

```
/shared/playlist/:shareToken
```

This route renders the shared playlist view without requiring user authentication.

## Related Documentation

- [User Playlists API](./user-playlists-api.md) - Create and manage playlists, enable sharing
- [Community Playlists API](./community-playlists-api.md) - Browse community-curated playlists
- [Games API](./games-api.md) - Game details and launch data
