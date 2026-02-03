# Platforms & Tags API

Filter options for game searches.

## List Platforms

`GET /api/platforms` - No auth required

Returns array with platform, count. Sorted alphabetically.

```json
[
  { "platform": "Flash", "count": 45234 },
  { "platform": "HTML5", "count": 12453 },
  { "platform": "Unity", "count": 3421 }
]
```

## List Tags

`GET /api/tags` - No auth required

Returns array with name, count. Sorted by count (highest first).

## Usage in Game Filtering

### Single platform filter

```javascript
const games = await api.get('/games', {
  params: { platform: 'Flash' },
});
```

### Multiple platforms (comma-separated)

```javascript
const games = await api.get('/games', {
  params: { platform: 'Flash,HTML5,Unity' },
});
```

### Filter by tags

```javascript
// Single tag
await api.get('/games', { params: { tags: 'Platformer' } });

// Multiple tags (comma-separated)
await api.get('/games', { params: { tags: 'Action,Platformer,Retro' } });
```

### Combined filtering

```javascript
const games = await api.get('/games', {
  params: {
    platform: 'Flash',
    tags: 'Platformer',
    sortBy: 'releaseDate',
    sortOrder: 'desc',
  },
});
```

## Building Filter UI

### Platform selector with counts

```javascript
const { data: platforms } = await api.get('/platforms');

const options = platforms.map((p) => ({
  label: `${p.platform} (${p.count.toLocaleString()})`,
  value: p.platform,
}));
```

### Tag autocomplete

```javascript
class TagAutocomplete {
  async init() {
    const { data } = await api.get('/tags');
    this.tags = data;
    this.input.addEventListener('input', (e) => this.filter(e.target.value));
  }

  filter(query) {
    const matches = this.tags
      .filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);

    this.showDropdown(matches);
  }
}
```

## Tag Categories

Common tags organized by category:

**Genres:** Action, Adventure, Platformer, Puzzle, RPG, Strategy, Shooter,
Sports, Racing, Fighting

**Themes:** Fantasy, Sci-Fi, Horror, Mystery, Historical, Educational, Kids,
Retro

**Gameplay:** Multiplayer, Single Player, Turn-Based, Real-Time,
Point-and-Click, Simulation

**Style:** Pixel Art, 3D, Cartoon, Realistic, Abstract, Anime

## Caching Strategy

Platforms and tags change infrequently - ideal for caching:

```javascript
class FilterCache {
  constructor(ttl = 3600000) {
    // 1 hour
    this.ttl = ttl;
    this.cache = new Map();
  }

  async getPlatforms() {
    return this.getCached('platforms', () => api.get('/platforms'));
  }

  async getTags() {
    return this.getCached('tags', () => api.get('/tags'));
  }

  async getCached(key, fetcher) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const { data } = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

## Best Practices

- Cache filter data locally (1 hour TTL recommended)
- Show game counts with each filter option
- Use tag autocomplete for large tag lists
- Lazy-load filter UI (only when opened)
- Parallel-load platforms and tags
- Debounce autocomplete search input
