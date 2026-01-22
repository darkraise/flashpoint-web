# Play Tracking API

Endpoints for tracking game play sessions, statistics, and user activity.

All endpoints require authentication with a valid JWT token.

## Start Session

Start a new play session for a game.

**Endpoint:** `POST /api/play/start`

**Authentication:** Required

**Permissions:** `games.play`

**Request Body:**

```json
{
  "gameId": "string (game UUID, required)",
  "gameTitle": "string (game title, required)"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "sessionId": "session-uuid-12345"
}
```

**Error Responses:**

- `400 Bad Request` - Missing gameId or gameTitle
- `401 Unauthorized` - Authentication required

**Examples:**

```bash
curl -X POST http://localhost:3100/api/play/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "abc123-def456",
    "gameTitle": "Super Flash Game"
  }'
```

```javascript
// Start play session when game loads
const { data } = await axios.post(
  'http://localhost:3100/api/play/start',
  {
    gameId: game.id,
    gameTitle: game.title
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

const sessionId = data.sessionId;
localStorage.setItem('currentSessionId', sessionId);
```

---

## End Session

End an active play session.

**Endpoint:** `POST /api/play/end`

**Authentication:** Required

**Request Body:**

```json
{
  "sessionId": "string (session UUID, required)"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Play session ended successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Missing sessionId
- `404 Not Found` - Session not found

**Examples:**

```bash
curl -X POST http://localhost:3100/api/play/end \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid-12345"
  }'
```

```javascript
// End play session when game closes
const sessionId = localStorage.getItem('currentSessionId');

await axios.post(
  'http://localhost:3100/api/play/end',
  { sessionId },
  { headers: { Authorization: `Bearer ${token}` } }
);

localStorage.removeItem('currentSessionId');
```

---

## Get User Stats

Get overall play statistics for the current user.

**Endpoint:** `GET /api/play/stats`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "totalSessions": 147,
  "totalPlayTimeMinutes": 2340,
  "totalGamesPlayed": 62,
  "averageSessionMinutes": 15.9,
  "completedSessions": 138,
  "abandonedSessions": 9,
  "firstPlayedAt": "2024-01-15T10:30:00Z",
  "lastPlayedAt": "2024-03-21T14:25:00Z"
}
```

**Field Descriptions:**

- `totalSessions` - Total number of play sessions
- `totalPlayTimeMinutes` - Total time spent playing (in minutes)
- `totalGamesPlayed` - Number of unique games played
- `averageSessionMinutes` - Average session duration
- `completedSessions` - Sessions ended normally
- `abandonedSessions` - Sessions not properly ended (auto-cleaned after 24 hours)

**Examples:**

```bash
curl http://localhost:3100/api/play/stats \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: stats } = await axios.get(
  'http://localhost:3100/api/play/stats',
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log(`Total play time: ${stats.totalPlayTimeMinutes} minutes`);
console.log(`Games played: ${stats.totalGamesPlayed}`);
console.log(`Average session: ${stats.averageSessionMinutes.toFixed(1)} minutes`);
```

---

## Get Game Stats

Get per-game play statistics for the current user.

**Endpoint:** `GET /api/play/game-stats`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `50` | Items per page (max: 100) |
| `offset` | integer | `0` | Number of items to skip |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "gameId": "abc123-def456",
      "gameTitle": "Super Flash Game",
      "totalSessions": 12,
      "totalPlayTimeMinutes": 180,
      "lastPlayedAt": "2024-03-21T14:25:00Z",
      "firstPlayedAt": "2024-02-10T09:15:00Z",
      "averageSessionMinutes": 15.0
    },
    {
      "gameId": "xyz789-uvw012",
      "gameTitle": "Puzzle Adventure",
      "totalSessions": 8,
      "totalPlayTimeMinutes": 240,
      "lastPlayedAt": "2024-03-20T16:30:00Z",
      "firstPlayedAt": "2024-02-15T11:00:00Z",
      "averageSessionMinutes": 30.0
    }
  ],
  "limit": 50,
  "offset": 0
}
```

**Examples:**

```bash
curl "http://localhost:3100/api/play/game-stats?limit=20&offset=0" \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data } = await axios.get(
  'http://localhost:3100/api/play/game-stats',
  {
    params: { limit: 20, offset: 0 },
    headers: { Authorization: `Bearer ${token}` }
  }
);

// Display in table
data.data.forEach(game => {
  console.log(`${game.gameTitle}: ${game.totalPlayTimeMinutes} min over ${game.totalSessions} sessions`);
});
```

---

## Get Play History

Get recent play history for the current user.

**Endpoint:** `GET /api/play/history`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `50` | Items per page (max: 100) |
| `offset` | integer | `0` | Number of items to skip |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "sessionId": "session-uuid-001",
      "gameId": "abc123-def456",
      "gameTitle": "Super Flash Game",
      "startedAt": "2024-03-21T14:00:00Z",
      "endedAt": "2024-03-21T14:25:00Z",
      "durationMinutes": 25,
      "completed": true
    },
    {
      "sessionId": "session-uuid-002",
      "gameId": "xyz789-uvw012",
      "gameTitle": "Puzzle Adventure",
      "startedAt": "2024-03-20T16:00:00Z",
      "endedAt": "2024-03-20T16:45:00Z",
      "durationMinutes": 45,
      "completed": true
    },
    {
      "sessionId": "session-uuid-003",
      "gameId": "def456-ghi789",
      "gameTitle": "Action Game",
      "startedAt": "2024-03-20T10:00:00Z",
      "endedAt": null,
      "durationMinutes": 0,
      "completed": false
    }
  ],
  "limit": 50,
  "offset": 0
}
```

**Field Descriptions:**

- `completed` - Whether session was properly ended
- `endedAt` - Null for abandoned/active sessions
- `durationMinutes` - 0 for incomplete sessions

**Examples:**

```bash
curl "http://localhost:3100/api/play/history?limit=10" \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: history } = await axios.get(
  'http://localhost:3100/api/play/history',
  {
    params: { limit: 10, offset: 0 },
    headers: { Authorization: `Bearer ${token}` }
  }
);

// Display recent plays
history.data.forEach(session => {
  const duration = session.completed
    ? `${session.durationMinutes} minutes`
    : 'In progress';
  console.log(`${session.gameTitle}: ${duration}`);
});
```

---

## Get Top Games

Get the most played games for the current user.

**Endpoint:** `GET /api/play/top-games`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `10` | Number of games to return (max: 50) |

**Response:** `200 OK`

```json
[
  {
    "gameId": "abc123-def456",
    "gameTitle": "Super Flash Game",
    "totalSessions": 25,
    "totalPlayTimeMinutes": 450,
    "lastPlayedAt": "2024-03-21T14:25:00Z"
  },
  {
    "gameId": "xyz789-uvw012",
    "gameTitle": "Puzzle Adventure",
    "totalSessions": 18,
    "totalPlayTimeMinutes": 540,
    "lastPlayedAt": "2024-03-20T16:30:00Z"
  }
]
```

**Note:** Sorted by total play time (descending).

**Examples:**

```bash
curl "http://localhost:3100/api/play/top-games?limit=5" \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: topGames } = await axios.get(
  'http://localhost:3100/api/play/top-games',
  {
    params: { limit: 10 },
    headers: { Authorization: `Bearer ${token}` }
  }
);

// Create leaderboard
topGames.forEach((game, index) => {
  console.log(`${index + 1}. ${game.gameTitle} - ${game.totalPlayTimeMinutes} min`);
});
```

---

## Get Activity Over Time

Get play activity aggregated by day.

**Endpoint:** `GET /api/play/activity-over-time`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `30` | Number of days to retrieve (max: 365) |

**Response:** `200 OK`

```json
[
  {
    "date": "2024-03-21",
    "sessions": 5,
    "totalMinutes": 120,
    "uniqueGames": 3
  },
  {
    "date": "2024-03-20",
    "sessions": 3,
    "totalMinutes": 90,
    "uniqueGames": 2
  },
  {
    "date": "2024-03-19",
    "sessions": 0,
    "totalMinutes": 0,
    "uniqueGames": 0
  }
]
```

**Note:** Returns data for last N days, including days with no activity (0 sessions).

**Examples:**

```bash
curl "http://localhost:3100/api/play/activity-over-time?days=7" \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: activity } = await axios.get(
  'http://localhost:3100/api/play/activity-over-time',
  {
    params: { days: 30 },
    headers: { Authorization: `Bearer ${token}` }
  }
);

// Plot on chart
const labels = activity.map(d => d.date);
const data = activity.map(d => d.totalMinutes);

// Using Chart.js
new Chart(ctx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      label: 'Play Time (minutes)',
      data
    }]
  }
});
```

---

## Get Games Distribution

Get distribution of play time across games (for pie charts).

**Endpoint:** `GET /api/play/games-distribution`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `10` | Number of top games to include (max: 20) |

**Response:** `200 OK`

```json
[
  {
    "gameTitle": "Super Flash Game",
    "playTimeMinutes": 450,
    "percentage": 32.5
  },
  {
    "gameTitle": "Puzzle Adventure",
    "playTimeMinutes": 380,
    "percentage": 27.4
  },
  {
    "gameTitle": "Action Platformer",
    "playTimeMinutes": 280,
    "percentage": 20.2
  },
  {
    "gameTitle": "Others",
    "playTimeMinutes": 280,
    "percentage": 19.9
  }
]
```

**Note:** Games beyond `limit` are grouped into "Others" category.

**Examples:**

```bash
curl "http://localhost:3100/api/play/games-distribution?limit=5" \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: distribution } = await axios.get(
  'http://localhost:3100/api/play/games-distribution',
  {
    params: { limit: 10 },
    headers: { Authorization: `Bearer ${token}` }
  }
);

// Create pie chart
new Chart(ctx, {
  type: 'pie',
  data: {
    labels: distribution.map(d => d.gameTitle),
    datasets: [{
      data: distribution.map(d => d.playTimeMinutes)
    }]
  }
});
```

---

## Play Tracking Best Practices

### Session Management

1. **Start on Load**: Call `/play/start` when game begins loading
2. **End on Close**: Call `/play/end` when user closes game or navigates away
3. **Handle Errors**: Retry failed end calls with exponential backoff
4. **Auto-cleanup**: Backend automatically cleans abandoned sessions after 24 hours

### Example Implementation

```javascript
class PlaySessionManager {
  constructor(gameId, gameTitle, token) {
    this.gameId = gameId;
    this.gameTitle = gameTitle;
    this.token = token;
    this.sessionId = null;
  }

  async start() {
    try {
      const { data } = await axios.post(
        'http://localhost:3100/api/play/start',
        {
          gameId: this.gameId,
          gameTitle: this.gameTitle
        },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      this.sessionId = data.sessionId;

      // Handle page unload
      window.addEventListener('beforeunload', () => this.end());

      return this.sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  async end() {
    if (!this.sessionId) return;

    try {
      await axios.post(
        'http://localhost:3100/api/play/end',
        { sessionId: this.sessionId },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
    } catch (error) {
      // Queue for retry
      this.queueRetry();
    }
  }

  queueRetry() {
    // Save to localStorage for retry on next page load
    const failedSessions = JSON.parse(
      localStorage.getItem('failedSessions') || '[]'
    );
    failedSessions.push(this.sessionId);
    localStorage.setItem('failedSessions', JSON.stringify(failedSessions));
  }
}

// Usage
const session = new PlaySessionManager(game.id, game.title, token);
await session.start();
```

### Statistics Dashboard

```javascript
async function loadStatsDashboard(token) {
  // Parallel requests for efficiency
  const [stats, topGames, activity, distribution] = await Promise.all([
    axios.get('/api/play/stats', { headers: { Authorization: `Bearer ${token}` } }),
    axios.get('/api/play/top-games', {
      params: { limit: 5 },
      headers: { Authorization: `Bearer ${token}` }
    }),
    axios.get('/api/play/activity-over-time', {
      params: { days: 30 },
      headers: { Authorization: `Bearer ${token}` }
    }),
    axios.get('/api/play/games-distribution', {
      params: { limit: 10 },
      headers: { Authorization: `Bearer ${token}` }
    })
  ]);

  return {
    overview: stats.data,
    topGames: topGames.data,
    activityChart: activity.data,
    distributionChart: distribution.data
  };
}
```

### Privacy Considerations

1. **User Consent**: Inform users about play tracking
2. **Opt-out**: Provide option to disable tracking
3. **Data Retention**: Implement data retention policies
4. **Anonymization**: Consider anonymizing old data

### Performance Optimization

1. **Batch Writes**: Backend batches session writes
2. **Async Calls**: Don't block game loading on session start
3. **Caching**: Cache statistics with appropriate TTL
4. **Pagination**: Use pagination for history and game stats

### Error Handling

```javascript
async function safeEndSession(sessionId, token, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.post(
        'http://localhost:3100/api/play/end',
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (error) {
      if (i === retries - 1) {
        // Final failure - log to error tracking service
        console.error('Failed to end session after retries:', error);
        return false;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## Background Processing

The backend automatically handles:

1. **Session Cleanup**: Abandoned sessions (>24 hours) marked as completed
2. **Statistics Aggregation**: Periodic aggregation of stats for performance
3. **Data Archival**: Old sessions archived after retention period

Cleanup job runs every 6 hours by default (configurable).
