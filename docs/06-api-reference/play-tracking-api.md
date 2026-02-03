# Play Tracking API

Track game play sessions and statistics. All endpoints require authentication.

## Start Session

`POST /api/play/start` - Requires `games.play` permission

Body: `{ "gameId": "uuid", "gameTitle": "string" }`

Returns `{ "success": true, "sessionId": "uuid" }`

## End Session

`POST /api/play/end` - Requires `games.play` permission

Body: `{ "sessionId": "uuid" }`

Error: `404 Not Found` if session doesn't exist

## Get User Stats

`GET /api/play/stats` - Requires `games.play` permission

Returns totalSessions, totalPlayTimeMinutes, totalGamesPlayed,
averageSessionMinutes, completedSessions, abandonedSessions, firstPlayedAt,
lastPlayedAt.

## Get Game Stats

`GET /api/play/game-stats?limit=50&offset=0` - Requires `games.play` permission

Returns paginated array with gameId, gameTitle, totalSessions,
totalPlayTimeMinutes, lastPlayedAt, firstPlayedAt, averageSessionMinutes.

## Get Play History

`GET /api/play/history?limit=50&offset=0` - Requires `games.play` permission

Returns paginated array with sessionId, gameId, gameTitle, startedAt, endedAt,
durationMinutes, completed.

## Get Top Games

`GET /api/play/top-games?limit=10` - Requires `games.play` permission

Returns array sorted by total play time (descending) with gameId, gameTitle,
totalSessions, totalPlayTimeMinutes, lastPlayedAt.

## Get Activity Over Time

`GET /api/play/activity-over-time?days=30` - Requires `games.play` permission

Query param: `days` (default: 30, max: 365)

Returns array with date, sessions, totalMinutes, uniqueGames for each day
(includes days with 0 activity).

## Get Games Distribution

`GET /api/play/games-distribution?limit=10` - Requires `games.play` permission

Returns pie chart data with gameTitle, playTimeMinutes, percentage. Games beyond
limit grouped as "Others".

## Session Management Pattern

```javascript
class PlaySessionManager {
  async start(gameId, gameTitle, token) {
    const { data } = await axios.post(
      '/api/play/start',
      { gameId, gameTitle },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    this.sessionId = data.sessionId;
    window.addEventListener('beforeunload', () => this.end());
  }

  async end() {
    if (!this.sessionId) return;
    try {
      await axios.post(
        '/api/play/end',
        { sessionId: this.sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      // Queue for retry on next load
      const failed = JSON.parse(localStorage.getItem('failedSessions') || '[]');
      failed.push(this.sessionId);
      localStorage.setItem('failedSessions', JSON.stringify(failed));
    }
  }
}
```

## Dashboard Pattern

```javascript
async function loadStatsDashboard(token) {
  const [stats, topGames, activity, distribution] = await Promise.all([
    axios.get('/api/play/stats', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get('/api/play/top-games?limit=5', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get('/api/play/activity-over-time?days=30', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get('/api/play/games-distribution?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  return {
    overview: stats.data,
    topGames: topGames.data,
    activityChart: activity.data,
    distributionChart: distribution.data,
  };
}
```

## Best Practices

- Call `/play/start` when game begins loading
- Call `/play/end` when game closes or user navigates away
- Handle failed end calls with exponential backoff and local retry queue
- Cache statistics locally (1-5 minute TTL) to reduce API calls
- Use pagination for history and game stats
- Backend auto-cleans abandoned sessions (>24 hours inactive)

## Notes

- Sessions have three states: Active, Completed, Abandoned (auto-cleaned after
  24h)
- Cleanup job runs every 6 hours
- Play time rounded to minutes
- Backend batches session writes for efficiency
