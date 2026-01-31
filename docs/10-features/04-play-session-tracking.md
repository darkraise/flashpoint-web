# Play Session Tracking

## Overview

The play session tracking feature automatically monitors and records user gameplay sessions, providing detailed statistics, analytics, and insights into gaming habits. The system tracks playtime, session counts, game preferences, and generates visualizations for user engagement metrics.

## User-Facing Functionality

### Dashboard Statistics
- **Total Games Played:** Unique games count
- **Total Playtime:** Aggregate time across all sessions
- **Total Sessions:** Number of play sessions
- **Average Session Length:** Mean session duration
- **First Play Date:** User's first recorded session
- **Last Play Date:** Most recent session

### Top Games Chart
- Bar chart showing most-played games
- Sorted by total playtime
- Configurable top N games (default: 10)
- Game titles and play counts displayed
- Visual representation of engagement

### Playtime Over Time
- Line chart showing daily play activity
- Configurable time range (7, 30, 90, 365 days)
- Sessions per day aggregation
- Trend analysis visualization
- Activity heatmap view

### Games Distribution
- Pie chart showing playtime distribution
- Top games by percentage of total time
- "Other" category for remaining games
- Color-coded segments
- Interactive hover tooltips

### Play History
- Chronological list of all sessions
- Game title, start time, duration
- Paginated view (50 per page)
- Filter by date range (future)
- Export functionality (future)

### Per-Game Statistics
- Individual game play counts
- Total playtime per game
- First/last played dates
- Average session length
- Completion tracking (future)

## Technical Implementation

### Architecture

**Backend Components:**
- `PlayTrackingService`: Core session tracking logic
- Play tracking routes (routes/play-tracking.ts): REST API
- `UserDatabaseService`: Database operations
- Background jobs: Abandoned session cleanup

**Frontend Components:**
- `DashboardView`: Main statistics page
- `UserStatsPanel`: Overview stats widget
- `TopGamesChart`: Bar chart component
- `PlaytimeChart`: Line chart component
- `GamesDistributionChart`: Pie chart component
- `usePlayTracking` hook: Session management

**Charting Library:**
- Recharts for data visualization
- Responsive charts
- Interactive tooltips
- Custom styling

### Database Schema

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

-- Indexes
CREATE INDEX idx_user_game_plays_user_id ON user_game_plays(user_id);
CREATE INDEX idx_user_game_plays_game_id ON user_game_plays(game_id);
CREATE INDEX idx_user_game_plays_started_at ON user_game_plays(started_at);
CREATE INDEX idx_user_game_plays_session_id ON user_game_plays(session_id);
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

-- Indexes
CREATE INDEX idx_user_game_stats_user_id ON user_game_stats(user_id);
CREATE INDEX idx_user_game_stats_game_id ON user_game_stats(game_id);
CREATE INDEX idx_user_game_stats_total_plays ON user_game_stats(total_plays);
CREATE INDEX idx_user_game_stats_total_playtime ON user_game_stats(total_playtime_seconds);
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

CREATE INDEX idx_user_stats_total_playtime ON user_stats(total_playtime_seconds);
```

### API Endpoints

#### POST /api/play/start
Start a new play session.

**Authentication:** Required

**Request Body:**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "gameTitle": "Super Mario Flash"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Errors:**
- 400: Missing gameId or gameTitle
- 401: Authentication required

#### POST /api/play/end
End an active play session.

**Authentication:** Required

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Play session ended successfully"
}
```

**Errors:**
- 400: Missing sessionId
- 401: Authentication required

#### GET /api/play/stats
Get overall statistics for current user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "totalGamesPlayed": 42,
  "totalPlaytimeSeconds": 86400,
  "totalPlaytimeFormatted": "24h 0m",
  "totalSessions": 156,
  "averageSessionLength": 554,
  "averageSessionLengthFormatted": "9m 14s",
  "firstPlayAt": "2024-01-15T10:30:00.000Z",
  "lastPlayAt": "2024-03-20T18:45:00.000Z"
}
```

**Errors:**
- 401: Authentication required

#### GET /api/play/game-stats
Get per-game statistics for current user.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  limit?: number;   // Max 100, default 50
  offset?: number;  // Pagination offset
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "gameTitle": "Super Mario Flash",
      "totalPlays": 15,
      "totalPlaytimeSeconds": 5400,
      "totalPlaytimeFormatted": "1h 30m",
      "firstPlayedAt": "2024-01-15T10:30:00.000Z",
      "lastPlayedAt": "2024-03-20T18:45:00.000Z",
      "averageSessionLength": 360,
      "averageSessionLengthFormatted": "6m 0s"
    }
    // ... more games
  ],
  "limit": 50,
  "offset": 0
}
```

**Errors:**
- 401: Authentication required

#### GET /api/play/history
Get play session history for current user.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  limit?: number;   // Max 100, default 50
  offset?: number;  // Pagination offset
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "gameTitle": "Super Mario Flash",
      "startedAt": "2024-03-20T18:30:00.000Z",
      "endedAt": "2024-03-20T18:45:00.000Z",
      "durationSeconds": 900,
      "durationFormatted": "15m 0s",
      "sessionId": "550e8400-e29b-41d4-a716-446655440001"
    }
    // ... more sessions
  ],
  "limit": 50,
  "offset": 0
}
```

**Errors:**
- 401: Authentication required

#### GET /api/play/top-games
Get top played games for current user.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  limit?: number;   // Max 50, default 10
}
```

**Response (200 OK):**
```json
[
  {
    "gameId": "550e8400-e29b-41d4-a716-446655440000",
    "gameTitle": "Super Mario Flash",
    "totalPlays": 15,
    "totalPlaytimeSeconds": 5400,
    "totalPlaytimeFormatted": "1h 30m"
  },
  {
    "gameId": "550e8400-e29b-41d4-a716-446655440002",
    "gameTitle": "Tank Trouble",
    "totalPlays": 12,
    "totalPlaytimeSeconds": 4200,
    "totalPlaytimeFormatted": "1h 10m"
  }
  // ... more games
]
```

**Errors:**
- 401: Authentication required

#### GET /api/play/activity-over-time
Get daily play activity aggregated over time.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  days?: number;   // Max 365, default 30
}
```

**Response (200 OK):**
```json
[
  {
    "date": "2024-03-20",
    "sessions": 5,
    "totalPlaytimeSeconds": 3600,
    "totalPlaytimeFormatted": "1h 0m"
  },
  {
    "date": "2024-03-19",
    "sessions": 3,
    "totalPlaytimeSeconds": 1800,
    "totalPlaytimeFormatted": "30m 0s"
  }
  // ... more days
]
```

**Errors:**
- 401: Authentication required

#### GET /api/play/games-distribution
Get playtime distribution across games.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  limit?: number;   // Max 20, default 10
}
```

**Response (200 OK):**
```json
[
  {
    "gameTitle": "Super Mario Flash",
    "totalPlaytimeSeconds": 5400,
    "percentage": 25.5,
    "totalPlaytimeFormatted": "1h 30m"
  },
  {
    "gameTitle": "Tank Trouble",
    "totalPlaytimeSeconds": 4200,
    "percentage": 19.8,
    "totalPlaytimeFormatted": "1h 10m"
  },
  {
    "gameTitle": "Other",
    "totalPlaytimeSeconds": 11600,
    "percentage": 54.7,
    "totalPlaytimeFormatted": "3h 13m"
  }
]
```

**Errors:**
- 401: Authentication required

### Session Lifecycle

**1. Session Start:**
```typescript
// Frontend: User clicks "Play" button
const sessionId = await startPlaySession(gameId, gameTitle);

// Backend: PlayTrackingService.startPlaySession()
- Generate unique session ID (UUID)
- Create record in user_game_plays table
- Set started_at to current timestamp
- Leave ended_at and duration_seconds NULL
- Return session ID
```

**2. Active Session:**
```typescript
// Session remains "active" while user plays
// ended_at is NULL
// Frontend keeps sessionId in memory
```

**3. Session End:**
```typescript
// Frontend: User closes player or navigates away
await endPlaySession(sessionId);

// Backend: PlayTrackingService.endPlaySession()
- Find session by sessionId
- Set ended_at to current timestamp
- Calculate duration: ended_at - started_at
- Update user_game_stats (aggregate data)
  - Increment total_plays
  - Add duration to total_playtime_seconds
  - Update first_played_at and last_played_at
- Update user_stats (overall stats)
  - Increment total_sessions
  - Add duration to total_playtime_seconds
  - Update first_play_at and last_play_at
  - Increment total_games_played if new game
```

**4. Abandoned Session Cleanup:**
```typescript
// Background job runs every 6 hours
PlayTrackingService.cleanupAbandonedSessions()

- Find sessions older than 24 hours with NULL ended_at
- Set ended_at to started_at + 24 hours
- Mark as abandoned (no stats update)
- Prevents database bloat
```

### Statistics Aggregation

**Real-time Updates:**
- Stats updated immediately on session end
- No batch processing delay
- Consistent view across requests

**Aggregate Queries:**
```sql
-- Top games by playtime
SELECT
  game_id,
  game_title,
  SUM(duration_seconds) as total_playtime,
  COUNT(*) as total_plays
FROM user_game_plays
WHERE user_id = ? AND ended_at IS NOT NULL
GROUP BY game_id
ORDER BY total_playtime DESC
LIMIT 10;

-- Activity over time (last 30 days)
SELECT
  DATE(started_at) as date,
  COUNT(*) as sessions,
  SUM(duration_seconds) as total_playtime
FROM user_game_plays
WHERE user_id = ?
  AND ended_at IS NOT NULL
  AND started_at >= datetime('now', '-30 days')
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Overall user stats
SELECT
  COUNT(DISTINCT game_id) as total_games_played,
  SUM(duration_seconds) as total_playtime,
  COUNT(*) as total_sessions,
  MIN(started_at) as first_play_at,
  MAX(ended_at) as last_play_at
FROM user_game_plays
WHERE user_id = ? AND ended_at IS NOT NULL;
```

## UI Components

### UserStatsPanel
**Location:** `frontend/src/components/stats/UserStatsPanel.tsx`

**Features:**
- Overview cards with key metrics
- Icon-based visual representation
- Formatted durations (hours, minutes)
- Loading states
- Error handling

### TopGamesChart
**Location:** `frontend/src/components/stats/TopGamesChart.tsx`

**Features:**
- Recharts Bar chart
- Horizontal bars
- Game titles on Y-axis
- Playtime on X-axis
- Tooltip with formatted duration
- Responsive sizing

### PlaytimeChart
**Location:** `frontend/src/components/stats/PlaytimeChart.tsx`

**Features:**
- Recharts Line chart
- Date on X-axis
- Sessions on Y-axis
- Area under line filled
- Gradient fill
- Interactive tooltip
- Time range selector (7/30/90/365 days)

### GamesDistributionChart
**Location:** `frontend/src/components/stats/GamesDistributionChart.tsx`

**Features:**
- Recharts Pie chart
- Game titles in legend
- Percentage labels
- Color-coded segments
- Interactive hover
- "Other" category for remaining games

### DashboardView
**Location:** `frontend/src/views/DashboardView.tsx`

**Features:**
- Grid layout with stats widgets
- Multiple chart sections
- Responsive breakpoints
- Loading skeletons
- Empty states for new users

## Common Use Cases

### 1. Automatic Session Tracking
```typescript
// In GamePlayer component
import { usePlayTracking } from '@/hooks/usePlayTracking';

const { startSession, endSession } = usePlayTracking();

useEffect(() => {
  let sessionId: string;

  const initSession = async () => {
    sessionId = await startSession(gameId, gameTitle);
  };

  initSession();

  return () => {
    // Cleanup: End session when component unmounts
    if (sessionId) {
      endSession(sessionId);
    }
  };
}, [gameId, gameTitle]);
```

### 2. View Dashboard Statistics
```typescript
// DashboardView loads stats automatically
const { data: stats } = useQuery({
  queryKey: ['play-stats'],
  queryFn: () => api.get('/play/stats').then(res => res.data)
});

// Displays total games, playtime, sessions, etc.
```

### 3. Analyze Top Games
```typescript
const { data: topGames } = useQuery({
  queryKey: ['top-games', limit],
  queryFn: () => api.get('/play/top-games', {
    params: { limit }
  }).then(res => res.data)
});

// Render bar chart
<TopGamesChart data={topGames} />
```

### 4. View Play History
```typescript
const { data: history } = useQuery({
  queryKey: ['play-history', page],
  queryFn: () => api.get('/play/history', {
    params: {
      limit: 50,
      offset: (page - 1) * 50
    }
  }).then(res => res.data)
});

// Displays chronological session list
```

### 5. Track Playtime Trends
```typescript
const [days, setDays] = useState(30);

const { data: activity } = useQuery({
  queryKey: ['activity-over-time', days],
  queryFn: () => api.get('/play/activity-over-time', {
    params: { days }
  }).then(res => res.data)
});

// Render line chart
<PlaytimeChart data={activity} days={days} />
```

## Best Practices

1. **Always end sessions** - Call endSession() on unmount
2. **Use session IDs** - Don't rely on gameId alone
3. **Handle errors gracefully** - Session tracking shouldn't block gameplay
4. **Cleanup abandoned sessions** - Run background job regularly
5. **Aggregate data** - Use materialized stats tables
6. **Index properly** - Optimize queries with indexes
7. **Format durations** - User-friendly time displays
8. **Cache chart data** - Use TanStack Query caching

## Troubleshooting

### Sessions not ending
- Check if endSession() is called on unmount
- Verify sessionId is preserved correctly
- Look for network errors in console
- Check abandoned session cleanup job

### Incorrect playtime
- Verify duration calculation (ended_at - started_at)
- Check for sessions with NULL ended_at
- Ensure timestamps are in UTC
- Validate aggregation queries

### Missing statistics
- Verify sessions are ending properly
- Check if user_game_stats is updating
- Ensure aggregate triggers are working
- Look for database constraints violations

### Charts not rendering
- Check if data format matches chart expectations
- Verify Recharts is installed
- Inspect console for errors
- Validate data transformations

## Future Enhancements

- Achievement system based on playtime
- Leaderboards (global/friends)
- Play streaks tracking
- Time-of-day analytics
- Platform-specific statistics
- Genre preferences analysis
- Session replay/sharing
- Goal setting (playtime targets)
- Yearly recap (Spotify Wrapped style)
- Export statistics to CSV/PDF
- Comparison with other users
- Game recommendations based on history
