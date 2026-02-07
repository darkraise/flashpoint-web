# Games API

Search, browse, and retrieve game information.

## Search Games

`GET /api/games` - No auth required

Query params: `search` (title/developer/publisher), `platform`, `series`,
`developers`, `publishers`, `playModes`, `languages`, `library`
(arcade|theatre), `tags`, `yearFrom`, `yearTo`, `sortBy`
(title|releaseDate|dateAdded|developer, default: title), `sortOrder` (asc|desc,
default: asc), `page` (default: 1), `limit` (default: 50, max: 100),
`showBroken` (default: false), `showExtreme` (default: false)

Returns paginated array with essential game fields (id, title, developer,
platformName, library, tags, orderTitle).

**Important:** Flash games without `.swf` launchCommands are excluded from
browse/search results. Only Flash games with direct SWF launch commands appear
in results and platform counts.

## Get Filter Options

`GET /api/games/filter-options` - No auth required

Returns platforms, developers, publishers, series, playModes, languages arrays
with name/code and count.

**Note:** Flash platform count reflects only games with `.swf` launchCommands
(playable Flash games). Non-SWF Flash games are excluded from counts.

## Get Random Game

`GET /api/games/random?library=arcade` - No auth required

Query param: `library` (optional)

Returns single random game object.

Error: `404 Not Found` if no games match criteria

## Get Game Details

`GET /api/games/:id` - No auth required

Returns full game object with all fields: id, title, alternateTitles, developer,
publisher, platformName, releaseDate, version, series, playMode, status, notes,
language, library, tags, description, launchCommand, applicationPath, source,
originalDescription, presentOnDisk, activeDataOnDisk, activeDataId, broken,
extreme, playCount, archiveState.

Error: `404 Not Found`

## Get Launch Data

`GET /api/games/:id/launch` - No auth required

Returns gameId, title, platform, launchCommand, contentUrl (proxied through
backend on `/game-proxy/` and `/game-zip/` routes), applicationPath, playMode,
canPlayInBrowser, and downloading status.

**Response:**

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Super Mario Flash",
  "platform": "Flash",
  "launchCommand": "http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "contentUrl": "http://localhost:3100/game-proxy/http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "applicationPath": ":http: :message:",
  "playMode": "Single Player",
  "canPlayInBrowser": true,
  "downloading": false
}
```

**Response (while downloading):**

```json
{
  "gameId": "...",
  "title": "Some Game",
  "platform": "Flash",
  "launchCommand": "...",
  "contentUrl": "...",
  "canPlayInBrowser": true,
  "downloading": true
}
```

**Notes:**

- `downloading: true` indicates game ZIP is being downloaded from configured gameDataSources
- Frontend should poll this endpoint every 2 seconds until `downloading` becomes false
- Backend awaits the mount to complete before returning (not fire-and-forget)

## Get Related Games

`GET /api/games/:id/related?limit=10` - No auth required

Query param: `limit` (default: 10, max: 50)

Returns array of related games based on developer/series/tags.

## Search Examples

```javascript
// Flash platformers from 2005-2010
await api.get('/games', {
  params: {
    platform: 'Flash',
    tags: 'Platformer',
    yearFrom: 2005,
    yearTo: 2010,
    sortBy: 'releaseDate',
    sortOrder: 'desc',
    limit: 50,
  },
});

// Multiple platforms
await api.get('/games', {
  params: { platform: 'Flash,HTML5,Unity' },
});

// Search by text
await api.get('/games', {
  params: { search: 'platformer', limit: 20 },
});
```

## Game Data Fields

**Search Results (GET /api/games):**

| Field        | Type                | Description                                |
| ------------ | ------------------- | ------------------------------------------ |
| id           | string (uuid)       | Unique game identifier                     |
| title        | string              | Game name                                  |
| developer    | string              | Developer name                             |
| platformName | string              | Platform (Flash, HTML5, etc.)              |
| tagsStr      | string              | Semicolon-separated tags                   |
| library      | string              | "arcade" (games) or "theatre" (animations) |
| orderTitle   | string              | Title for sorting                          |

**Game Details (GET /api/games/:id):**

| Field            | Type                | Description                                |
| ---------------- | ------------------- | ------------------------------------------ |
| id               | string (uuid)       | Unique game identifier                     |
| title            | string              | Game name                                  |
| platformName     | string              | Platform (Flash, HTML5, etc.)              |
| library          | string              | "arcade" (games) or "theatre" (animations) |
| developer        | string              | Developer name                             |
| publisher        | string              | Publisher name (optional in list views)    |
| releaseDate      | string (YYYY-MM-DD) | Original release date                      |
| tags             | string              | Semicolon-separated tags                   |
| description      | string              | Full description                           |
| launchCommand    | string              | File/URL to launch                         |
| broken           | boolean             | Known to be broken                         |
| extreme          | boolean             | Contains extreme content                   |
| presentOnDisk    | boolean             | Files available locally                    |
| canPlayInBrowser | boolean             | Playable via web (Flash/HTML5)             |

## Best Practices

- Use pagination (20-50 items per page)
- Filter early to reduce result set
- Combine search terms with filters
- Cache results locally (important for repeated searches)
- Check `canPlayInBrowser` before attempting to play
- Use exact tag names from `/api/tags` endpoint
- Note: Flash games require `.swf` launchCommands to appear in browse/search results
