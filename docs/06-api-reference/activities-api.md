# Activities API

Audit logs and activity statistics. All endpoints require `activities.read` permission and `enableStatistics` feature flag.

## List Activity Logs

`GET /api/activities` - Requires `activities.read` permission

Query params: `page` (default: 1), `limit` (default: 50, max: 100), `userId`, `username`, `action`, `resource`, `startDate`, `endDate`, `sortBy` (createdAt|username|action|resource|ipAddress, default: createdAt), `sortOrder` (asc|desc, default: desc)

Returns paginated array with id, userId, username, action, resource, resourceId, details, ipAddress, userAgent, createdAt.

## Get Activity Statistics

`GET /api/activities/stats` - Requires `activities.read` permission

Query params: `timeRange` (24h|7d|30d, default: 24h) or custom `startDate`/`endDate`

```json
{
  "total": 2543,
  "uniqueUsers": 45,
  "peakHour": { "hour": 14, "count": 342 },
  "authEvents": { "total": 248, "successful": 235, "failed": 13 },
  "failedOperations": 28,
  "systemEvents": 156,
  "trends": { "totalChange": 12, "userChange": 5, "authChange": 8 }
}
```

## Get Activity Trend

`GET /api/activities/trend?days=7` - Requires `activities.read` permission

Query params: `days` (default: 7, max: 30)

Returns array with date, sessions, totalMinutes, uniqueGames for each day.

## Get Top Actions

`GET /api/activities/top-actions?limit=10&timeRange=24h` - Requires `activities.read` permission

Query params: `limit` (default: 10, max: 50), `timeRange` (24h|7d|30d, default: 24h)

Returns array with action, count, percentage, category, topResource, exampleActivity.

## Get Activity Breakdown

`GET /api/activities/breakdown?groupBy=resource&limit=10` - Requires `activities.read` permission

Query params: `groupBy` (resource|user|ip, default: resource), `limit` (default: 10, max: 50), `timeRange` (24h|7d|30d, default: 24h)

Returns array grouped by specified criteria with key, count, percentage, metadata.

## Activity Actions

Common recorded actions:

**Authentication:** auth.login, auth.login.failed, auth.logout, auth.register, auth.password.change, auth.token.refresh

**Games:** games.launch, games.view, games.search

**Playlists:** playlists.create, playlists.view, playlists.update, playlists.delete, playlists.add_game, playlists.remove_game

**Users:** users.create, users.view, users.update, users.delete, users.settings

**Roles & Permissions:** roles.create, roles.update, roles.delete, permissions.assign, permissions.revoke

## Best Practices

- Review activity logs daily for security anomalies
- Monitor `auth.login.failed` for brute force attempts
- Use `groupBy=ip` to identify unauthorized access
- Filter by date range to limit query scope
- Logs retained for 90 days minimum (immutable)
