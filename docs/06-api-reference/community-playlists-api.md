# Community Playlists API

Browse and download community-curated playlists from the Flashpoint Archive.

**Base Path:** `/api/community-playlists`

## Overview

Community playlists are curated game collections maintained by the Flashpoint
community. This API allows browsing available playlists and downloading them
to your local Flashpoint installation.

## Browse Community Playlists

`GET /api/community-playlists` - Optional auth

Fetches the list of available community playlists from the Flashpoint Archive.

**Response:**

```json
{
  "categories": [
    {
      "name": "Featured",
      "description": "Staff picks and popular playlists",
      "playlists": [
        {
          "id": "playlist-uuid",
          "title": "Best Flash Games 2008",
          "description": "Top-rated Flash games from 2008",
          "author": "FlashpointTeam",
          "gameCount": 50,
          "downloadUrl": "https://flashpointarchive.org/playlists/best-2008.json",
          "thumbnailUrl": "https://flashpointarchive.org/thumbnails/best-2008.png"
        }
      ]
    },
    {
      "name": "By Genre",
      "description": "Playlists organized by game genre",
      "playlists": [...]
    }
  ],
  "lastUpdated": "2024-01-15T10:00:00.000Z"
}
```

## Download Community Playlist

`POST /api/community-playlists/download` - Requires auth + `playlists.create` permission

Downloads a community playlist and saves it to the local Flashpoint Data folder.

**Request Body:**

```json
{
  "downloadUrl": "https://flashpointarchive.org/playlists/best-2008.json"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| downloadUrl | string | Yes | Valid HTTPS URL, max 2000 chars |

**Allowed Download Domains:**

For security (SSRF protection), downloads are only allowed from these domains:

- `flashpointarchive.org` (and subdomains)
- `fpfss.unstable.life`
- `github.com`

**Response:** `201 Created`

```json
{
  "id": "playlist-uuid",
  "title": "Best Flash Games 2008",
  "description": "Top-rated Flash games from 2008",
  "author": "FlashpointTeam",
  "games": [
    {
      "gameId": "game-uuid-1",
      "notes": "Classic platformer"
    }
  ],
  "icon": "star",
  "library": "arcade"
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid URL or domain not allowed |
| `409 Conflict` | Playlist with this ID already exists locally |
| `500 Internal Server Error` | Failed to download or parse playlist |

## Example Workflow

```javascript
// 1. Browse available playlists
const { categories } = await api.get('/community-playlists');

// 2. Display playlists to user
const allPlaylists = categories.flatMap(c => c.playlists);
console.log(`Found ${allPlaylists.length} community playlists`);

// 3. User selects a playlist to download
const selectedPlaylist = allPlaylists[0];

// 4. Download the playlist
try {
  const downloaded = await api.post('/community-playlists/download', {
    downloadUrl: selectedPlaylist.downloadUrl
  });
  console.log(`Downloaded: ${downloaded.title} with ${downloaded.games.length} games`);
} catch (error) {
  if (error.response?.status === 409) {
    console.log('Playlist already exists locally');
  }
}

// 5. Playlist is now available in /api/playlists
const localPlaylists = await api.get('/playlists');
```

## Security Considerations

- Only HTTPS URLs are accepted (no HTTP)
- Domain allowlist prevents SSRF attacks
- Downloaded playlist files are validated before saving
- Playlist IDs are validated to prevent path traversal
- Activity logging tracks all downloads

## Related Documentation

- [Playlists API](./playlists-api.md) - Access downloaded playlists
- [User Playlists API](./user-playlists-api.md) - Create personal playlists
