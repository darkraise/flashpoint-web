# Games API

Search, browse, and retrieve game information.

## Search Games

`GET /api/games` - No auth required

Query params: `search` (title/developer/publisher), `platform`, `series`, `developers`, `publishers`, `playModes`, `languages`, `library` (arcade|theatre), `tags`, `yearFrom`, `yearTo`, `sortBy` (title|releaseDate|dateAdded|developer, default: title), `sortOrder` (asc|desc, default: asc), `page` (default: 1), `limit` (default: 50, max: 100), `showBroken` (default: false), `showExtreme` (default: false)

Returns paginated array with standard game fields (id, title, developer, publisher, platformName, releaseDate, tags, description, etc.).

## Get Filter Options

`GET /api/games/filter-options` - No auth required

Returns platforms, developers, publishers, series, playModes, languages arrays with name/code and count.

## Get Random Game

`GET /api/games/random?library=arcade` - No auth required

Query param: `library` (optional)

Returns single random game object.

Error: `404 Not Found` if no games match criteria

## Get Game Details

`GET /api/games/:id` - No auth required

Returns full game object with all fields: id, title, alternateTitles, developer, publisher, platformName, releaseDate, version, series, playMode, status, notes, language, library, tags, description, launchCommand, applicationPath, source, originalDescription, presentOnDisk, activeDataOnDisk, activeDataId, broken, extreme, playCount, archiveState.

Error: `404 Not Found`

## Get Launch Data

`GET /api/games/:id/launch` - No auth required

Returns gameId, title, platform, launchCommand, contentUrl (proxied through game-service), applicationPath, playMode, canPlayInBrowser.

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
    limit: 50
  }
});

// Multiple platforms
await api.get('/games', {
  params: { platform: 'Flash,HTML5,Unity' }
});

// Search by text
await api.get('/games', {
  params: { search: 'platformer', limit: 20 }
});
```

## Game Data Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique game identifier |
| title | string | Game name |
| platformName | string | Platform (Flash, HTML5, etc.) |
| library | string | "arcade" (games) or "theatre" (animations) |
| developer | string | Developer name |
| publisher | string | Publisher name |
| releaseDate | string (YYYY-MM-DD) | Original release date |
| tags | string | Semicolon-separated tags |
| description | string | Full description |
| launchCommand | string | File/URL to launch |
| broken | boolean | Known to be broken |
| extreme | boolean | Contains extreme content |
| presentOnDisk | boolean | Files available locally |
| canPlayInBrowser | boolean | Playable via web (Flash/HTML5) |

## Best Practices

- Use pagination (20-50 items per page)
- Filter early to reduce result set
- Combine search terms with filters
- Cache results locally (important for repeated searches)
- Check `canPlayInBrowser` before attempting to play
- Use exact tag names from `/api/tags` endpoint
