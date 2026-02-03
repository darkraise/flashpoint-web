# Play Session Tracking

## Overview

Play session tracking automatically monitors and records user gameplay sessions,
providing statistics on games played, playtime, and engagement metrics through
visualizations and dashboard displays.

## Architecture

**Backend Components:**

- `PlayTrackingService`: Core session tracking logic
- Play tracking routes (routes/play-tracking.ts): REST API
- Background jobs: Abandoned session cleanup

**Frontend Components:**

- `DashboardView`: Main statistics page
- `UserStatsPanel`: Overview stats widget
- `TopGamesChart`: Bar chart component
- `PlaytimeChart`: Line chart component
- `GamesDistributionChart`: Pie chart component

**Charting Library:** Recharts for data visualization

## Database Schema

**user_game_plays table:**

```sql
CREATE TABLE user_game_plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  duration_seconds INTEGER,
  session_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**user_game_stats table (aggregated):**

```sql
CREATE TABLE user_game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  total_plays INTEGER DEFAULT 0,
  total_playtime_seconds INTEGER DEFAULT 0,
  first_played_at TEXT,
  last_played_at TEXT,
  UNIQUE(user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**user_stats table (overall stats):**

```sql
CREATE TABLE user_stats (
  user_id INTEGER PRIMARY KEY,
  total_games_played INTEGER DEFAULT 0,
  total_playtime_seconds INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  first_play_at TEXT,
  last_play_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

#### POST /api/play/start

Start a new play session.

- **Body:** `{ "gameId", "gameTitle" }`
- **Response:** `{ "success": true, "sessionId": "uuid" }`

#### POST /api/play/end

End an active play session.

- **Body:** `{ "sessionId" }`
- **Response:** `{ "success": true }`

#### GET /api/play/stats

Get overall statistics for current user.

- **Response:**
  ```json
  {
    "totalGamesPlayed": 42,
    "totalPlaytimeSeconds": 86400,
    "totalPlaytimeFormatted": "24h 0m",
    "totalSessions": 156,
    "averageSessionLength": 554,
    "firstPlayAt": "2024-01-15T10:30:00.000Z",
    "lastPlayAt": "2024-03-20T18:45:00.000Z"
  }
  ```

#### GET /api/play/game-stats

Get per-game statistics.

- **Query:** `limit`, `offset`
- **Response:** Array of game statistics with play counts and duration

#### GET /api/play/history

Get play session history.

- **Query:** `limit`, `offset`
- **Response:** Array of sessions with formatted duration

#### GET /api/play/top-games

Get top played games by playtime.

- **Query:** `limit`
- **Response:** Array of top games with playtime

#### GET /api/play/activity-over-time

Get daily play activity aggregated over time.

- **Query:** `days` (max 365, default 30)
- **Response:** Array with date, sessions count, and total playtime

#### GET /api/play/games-distribution

Get playtime distribution across games.

- **Query:** `limit`
- **Response:** Array with game titles, playtime, and percentage

## Session Lifecycle

**1. Session Start:**

- Generate unique session ID (UUID)
- Create record in user_game_plays table
- Set started_at to current timestamp
- Leave ended_at and duration_seconds NULL

**2. Active Session:**

- Session remains "active" while user plays
- ended_at is NULL
- Frontend keeps sessionId in memory

**3. Session End:**

- Set ended_at to current timestamp
- Calculate duration: ended_at - started_at
- Update user_game_stats (aggregate data)
- Update user_stats (overall stats)

**4. Abandoned Session Cleanup:**

- Background job runs every 6 hours
- Find sessions older than 24 hours with NULL ended_at
- Set ended_at to started_at + 24 hours
- Mark as abandoned (no stats update)

## Permissions

Play session tracking requires no special permissions. All authenticated users
can track their own sessions.

## Common Use Cases

### 1. Automatic Session Tracking

```typescript
const { startSession, endSession } = usePlayTracking();

useEffect(() => {
  let sessionId: string;

  const initSession = async () => {
    sessionId = await startSession(gameId, gameTitle);
  };

  initSession();

  return () => {
    if (sessionId) {
      endSession(sessionId);
    }
  };
}, [gameId, gameTitle]);
```

### 2. View Dashboard Statistics

```typescript
const { data: stats } = useQuery({
  queryKey: ['play-stats'],
  queryFn: () => api.get('/play/stats').then((res) => res.data),
});
```

### 3. Analyze Top Games

```typescript
const { data: topGames } = useQuery({
  queryKey: ['top-games', limit],
  queryFn: () => api.get('/play/top-games', {
    params: { limit }
  }).then(res => res.data)
});

<TopGamesChart data={topGames} />
```

### 4. Track Playtime Trends

```typescript
const [days, setDays] = useState(30);

const { data: activity } = useQuery({
  queryKey: ['activity-over-time', days],
  queryFn: () => api.get('/play/activity-over-time', {
    params: { days }
  }).then(res => res.data)
});

<PlaytimeChart data={activity} days={days} />
```

## Best Practices

1. Always end sessions on unmount
2. Use session IDs (don't rely on gameId alone)
3. Handle errors gracefully - session tracking shouldn't block gameplay
4. Run cleanup jobs regularly
5. Aggregate data using materialized stats tables
6. Optimize queries with indexes
7. Format durations user-friendly
8. Cache chart data with React Query
9. Use optimistic updates for better UX
10. Show loading skeletons while fetching

## Troubleshooting

**Sessions not ending:**

- Check if endSession() is called on unmount
- Verify sessionId is preserved correctly
- Look for network errors in console
- Check abandoned session cleanup job

**Incorrect playtime:**

- Verify duration calculation (ended_at - started_at)
- Check for sessions with NULL ended_at
- Ensure timestamps are in UTC
- Validate aggregation queries

**Missing statistics:**

- Verify sessions are ending properly
- Check if user_game_stats is updating
- Ensure aggregate triggers are working
- Look for database constraints violations

**Charts not rendering:**

- Check if data format matches chart expectations
- Verify Recharts is installed
- Inspect console for errors
- Validate data transformations
