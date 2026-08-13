# Community Playlists API

Browse and download community-curated playlists from the Flashpoint Archive.

**Base Path:** `/api/community-playlists`

## Overview

Community playlists are curated game collections maintained by the Flashpoint
community. This API allows browsing available playlists and downloading them
to your local Flashpoint installation.

## Browse Community Playlists

`GET /api/community-playlists` - Optional auth

Returns the pre-seeded playlist index. The index used to be scraped from
[the Playlists wiki page](https://flashpointarchive.org/datahub/Playlists) on
every request, but that page now sits behind a Cloudflare challenge that no
plain HTTP client can pass. The list ships with the server instead, in
`backend/src/data/community-playlists.json`, extracted from a saved copy of the
page.

The seed only lists playlists whose download URL is on the allowlist below, so
every entry it returns can also be downloaded. That excludes the wiki's "Old
Default Playlists" section, which is hosted off the allowlist and still uses the
pre-Flashpoint 10 playlist format.

**Response:**

```json
{
  "categories": [
    {
      "name": "Animations",
      "playlists": [
        {
          "name": "Animal School",
          "author": "Ekul",
          "description": "BBC's Animal School",
          "downloadUrl": "https://flashpointarchive.org/w/images/b/bf/Animal_school_playlist.json",
          "category": "Animations"
        }
      ]
    },
    {
      "name": "Games - Community favorites",
      "playlists": []
    }
  ],
  "lastUpdated": "2026-08-13"
}
```

| Field | Type | Description |
|-------|------|-------------|
| categories | array | Wiki sections, in page order |
| lastUpdated | string | Date the bundled snapshot was captured (`YYYY-MM-DD`) |

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

- `flashpointarchive.org` (and subdomains, including `download.`)
- `fpfss.unstable.life`
- `github.com`
- `raw.githubusercontent.com`
- `gist.githubusercontent.com`

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
