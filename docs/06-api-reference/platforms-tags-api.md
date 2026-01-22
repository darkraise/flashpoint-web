# Platforms & Tags API

Endpoints for retrieving platform and tag information used for filtering games.

## List Platforms

Get all available gaming platforms with game counts.

**Endpoint:** `GET /api/platforms`

**Authentication:** Not required

**Response:** `200 OK`

```json
[
  {
    "platform": "Flash",
    "count": 45234
  },
  {
    "platform": "HTML5",
    "count": 12453
  },
  {
    "platform": "Shockwave",
    "count": 8976
  },
  {
    "platform": "Unity",
    "count": 3421
  },
  {
    "platform": "Java",
    "count": 2156
  },
  {
    "platform": "Silverlight",
    "count": 876
  },
  {
    "platform": "3DVIA Player",
    "count": 234
  }
]
```

**Field Descriptions:**

- `platform` - Platform name (e.g., "Flash", "HTML5")
- `count` - Number of games available on this platform

**Sorting:** Platforms are sorted alphabetically by name.

**Examples:**

```bash
curl http://localhost:3100/api/platforms
```

```javascript
const { data: platforms } = await axios.get(
  'http://localhost:3100/api/platforms'
);

// Create filter dropdown
const platformOptions = platforms.map(p => ({
  label: `${p.platform} (${p.count.toLocaleString()})`,
  value: p.platform
}));

// Display in UI
console.log('Available platforms:');
platforms.forEach(p => {
  console.log(`  ${p.platform}: ${p.count.toLocaleString()} games`);
});
```

```python
# Python requests
import requests

response = requests.get('http://localhost:3100/api/platforms')
platforms = response.json()

for platform in platforms:
    print(f"{platform['platform']}: {platform['count']} games")
```

---

## List Tags

Get all available tags with usage counts.

**Endpoint:** `GET /api/tags`

**Authentication:** Not required

**Response:** `200 OK`

```json
[
  {
    "name": "Action",
    "count": 12543
  },
  {
    "name": "Platformer",
    "count": 8234
  },
  {
    "name": "Puzzle",
    "count": 7892
  },
  {
    "name": "Adventure",
    "count": 6543
  },
  {
    "name": "Shooter",
    "count": 5421
  },
  {
    "name": "Strategy",
    "count": 4123
  },
  {
    "name": "RPG",
    "count": 3456
  },
  {
    "name": "Sports",
    "count": 2876
  }
]
```

**Field Descriptions:**

- `name` - Tag name (e.g., "Action", "Platformer")
- `count` - Number of games tagged with this tag

**Sorting:** Tags are sorted by count (descending) - most popular tags first.

**Examples:**

```bash
curl http://localhost:3100/api/tags
```

```javascript
const { data: tags } = await axios.get(
  'http://localhost:3100/api/tags'
);

// Create filter checkboxes
const tagCheckboxes = tags.slice(0, 20).map(tag => ({
  label: `${tag.name} (${tag.count})`,
  value: tag.name
}));

// Group tags by popularity
const popularTags = tags.filter(t => t.count >= 1000);
const normalTags = tags.filter(t => t.count < 1000);

console.log(`Popular tags: ${popularTags.length}`);
console.log(`Total tags: ${tags.length}`);
```

```python
# Python requests
import requests

response = requests.get('http://localhost:3100/api/tags')
tags = response.json()

# Get top 10 tags
top_tags = tags[:10]
for tag in top_tags:
    print(f"{tag['name']}: {tag['count']} games")
```

---

## Usage in Game Filtering

Both platforms and tags are used in the game search endpoint.

### Filter by Platform

```javascript
// Single platform
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    platform: 'Flash'
  }
});

// Multiple platforms (comma-separated)
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    platform: 'Flash,HTML5,Unity'
  }
});
```

### Filter by Tags

```javascript
// Single tag
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    tags: 'Platformer'
  }
});

// Multiple tags (comma-separated)
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    tags: 'Action,Platformer,Retro'
  }
});
```

### Combined Filtering

```javascript
// Flash platformer games
const { data } = await axios.get('http://localhost:3100/api/games', {
  params: {
    platform: 'Flash',
    tags: 'Platformer',
    sortBy: 'releaseDate',
    sortOrder: 'desc'
  }
});
```

---

## Building Filter UI

### Platform Selector

```javascript
async function createPlatformSelector() {
  const { data: platforms } = await axios.get(
    'http://localhost:3100/api/platforms'
  );

  // Create multi-select dropdown
  const selector = document.createElement('select');
  selector.multiple = true;
  selector.id = 'platform-filter';

  platforms.forEach(platform => {
    const option = document.createElement('option');
    option.value = platform.platform;
    option.text = `${platform.platform} (${platform.count.toLocaleString()})`;
    selector.appendChild(option);
  });

  return selector;
}
```

### Tag Cloud

```javascript
async function createTagCloud(maxTags = 50) {
  const { data: tags } = await axios.get(
    'http://localhost:3100/api/tags'
  );

  // Get top tags
  const topTags = tags.slice(0, maxTags);

  // Calculate font sizes based on count
  const maxCount = Math.max(...topTags.map(t => t.count));
  const minCount = Math.min(...topTags.map(t => t.count));

  const tagCloud = document.createElement('div');
  tagCloud.className = 'tag-cloud';

  topTags.forEach(tag => {
    // Scale font size between 12px and 32px
    const ratio = (tag.count - minCount) / (maxCount - minCount);
    const fontSize = 12 + (ratio * 20);

    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag.name;
    tagElement.style.fontSize = `${fontSize}px`;
    tagElement.onclick = () => filterByTag(tag.name);

    tagCloud.appendChild(tagElement);
  });

  return tagCloud;
}
```

### Checkbox Filter Group

```javascript
async function createTagCheckboxes(categoryFilter = null) {
  const { data: tags } = await axios.get(
    'http://localhost:3100/api/tags'
  );

  // Filter by category if needed
  let filteredTags = tags;
  if (categoryFilter) {
    filteredTags = tags.filter(t =>
      categoryFilter.includes(t.name.toLowerCase())
    );
  }

  const container = document.createElement('div');
  container.className = 'checkbox-group';

  filteredTags.slice(0, 20).forEach(tag => {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag.name;
    checkbox.name = 'tags';

    const text = document.createTextNode(
      ` ${tag.name} (${tag.count.toLocaleString()})`
    );

    label.appendChild(checkbox);
    label.appendChild(text);
    container.appendChild(label);
  });

  return container;
}
```

---

## Autocomplete Implementation

### Tag Autocomplete

```javascript
class TagAutocomplete {
  constructor(inputElement) {
    this.input = inputElement;
    this.tags = [];
    this.selectedTags = new Set();

    this.init();
  }

  async init() {
    const { data } = await axios.get('http://localhost:3100/api/tags');
    this.tags = data;

    this.input.addEventListener('input', (e) => this.handleInput(e));
  }

  handleInput(event) {
    const query = event.target.value.toLowerCase();

    if (query.length < 2) {
      this.hideSuggestions();
      return;
    }

    const matches = this.tags
      .filter(tag => tag.name.toLowerCase().includes(query))
      .slice(0, 10);

    this.showSuggestions(matches);
  }

  showSuggestions(tags) {
    // Create suggestion dropdown
    let dropdown = document.getElementById('tag-suggestions');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'tag-suggestions';
      dropdown.className = 'autocomplete-dropdown';
      this.input.parentNode.appendChild(dropdown);
    }

    dropdown.innerHTML = '';

    tags.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = `${tag.name} (${tag.count})`;
      item.onclick = () => this.selectTag(tag.name);
      dropdown.appendChild(item);
    });
  }

  selectTag(tagName) {
    this.selectedTags.add(tagName);
    this.input.value = '';
    this.hideSuggestions();
    this.updateSelectedDisplay();
  }

  updateSelectedDisplay() {
    // Update UI with selected tags
    const display = document.getElementById('selected-tags');
    display.innerHTML = '';

    this.selectedTags.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.textContent = tag;

      const remove = document.createElement('button');
      remove.textContent = '×';
      remove.onclick = () => {
        this.selectedTags.delete(tag);
        this.updateSelectedDisplay();
      };

      badge.appendChild(remove);
      display.appendChild(badge);
    });
  }

  getSelectedTags() {
    return Array.from(this.selectedTags);
  }

  hideSuggestions() {
    const dropdown = document.getElementById('tag-suggestions');
    if (dropdown) {
      dropdown.innerHTML = '';
    }
  }
}

// Usage
const autocomplete = new TagAutocomplete(
  document.getElementById('tag-input')
);
```

---

## Platform & Tag Statistics

### Platform Distribution

```javascript
async function getPlatformDistribution() {
  const { data: platforms } = await axios.get(
    'http://localhost:3100/api/platforms'
  );

  const total = platforms.reduce((sum, p) => sum + p.count, 0);

  return platforms.map(platform => ({
    ...platform,
    percentage: ((platform.count / total) * 100).toFixed(2)
  }));
}

// Create pie chart
const distribution = await getPlatformDistribution();
new Chart(ctx, {
  type: 'pie',
  data: {
    labels: distribution.map(d => d.platform),
    datasets: [{
      data: distribution.map(d => d.count)
    }]
  }
});
```

### Tag Categories

Common tag categories for organization:

**Genre Tags:**
- Action, Adventure, Platformer, Puzzle, RPG, Strategy, Shooter, Sports, Racing, Fighting

**Theme Tags:**
- Fantasy, Sci-Fi, Horror, Mystery, Historical, Educational, Kids, Retro

**Gameplay Tags:**
- Multiplayer, Single Player, Turn-Based, Real-Time, Point-and-Click, Simulation

**Style Tags:**
- Pixel Art, 3D, Cartoon, Realistic, Abstract, Anime

```javascript
const tagCategories = {
  genre: ['Action', 'Adventure', 'Platformer', 'Puzzle', 'RPG', 'Strategy'],
  theme: ['Fantasy', 'Sci-Fi', 'Horror', 'Mystery', 'Historical'],
  gameplay: ['Multiplayer', 'Single Player', 'Turn-Based', 'Real-Time'],
  style: ['Pixel Art', '3D', 'Cartoon', 'Realistic']
};

async function getTagsByCategory(category) {
  const { data: allTags } = await axios.get('http://localhost:3100/api/tags');

  const categoryTags = tagCategories[category] || [];
  return allTags.filter(tag => categoryTags.includes(tag.name));
}
```

---

## Caching Strategies

Platforms and tags change infrequently, making them ideal for caching:

```javascript
class FilterCache {
  constructor(ttl = 3600000) { // 1 hour default
    this.ttl = ttl;
    this.cache = new Map();
  }

  async getPlatforms() {
    return this.getCached('platforms', () =>
      axios.get('http://localhost:3100/api/platforms')
    );
  }

  async getTags() {
    return this.getCached('tags', () =>
      axios.get('http://localhost:3100/api/tags')
    );
  }

  async getCached(key, fetcher) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const { data } = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const filterCache = new FilterCache();
const platforms = await filterCache.getPlatforms();
const tags = await filterCache.getTags();
```

---

## Best Practices

### Loading Filter Data

1. **Parallel Loading**: Load platforms and tags in parallel
2. **Caching**: Cache filter data with reasonable TTL
3. **Lazy Loading**: Load only when filter UI is opened
4. **Prefetching**: Prefetch on page load for better UX

### UI Implementation

1. **Show Counts**: Always display game counts with filters
2. **Sort Options**: Allow users to sort by name or count
3. **Search**: Implement search within filters for large lists
4. **Selected State**: Clearly indicate selected filters
5. **Clear All**: Provide easy way to clear all filters

### Performance

1. **Virtualization**: Use virtual scrolling for large tag lists
2. **Debouncing**: Debounce search input in autocomplete
3. **Lazy Rendering**: Render only visible filter options
4. **Progressive Loading**: Load popular items first

### Accessibility

1. **Keyboard Navigation**: Support arrow keys in dropdowns
2. **ARIA Labels**: Use proper ARIA attributes
3. **Focus Management**: Manage focus for keyboard users
4. **Screen Readers**: Ensure filter state is announced
