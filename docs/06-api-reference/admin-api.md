# Admin & Operations API

Administrative endpoints for system monitoring and maintenance. All endpoints require authentication and appropriate permissions unless otherwise noted.

## Health Endpoints

### Basic Health Check

`GET /api/health` - No auth required

Returns `200 OK` (healthy) or `503 Service Unavailable` (unhealthy)

```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T15:30:45Z"
}
```

### Detailed Health Check

`GET /api/health/detailed` - Requires `settings.view` permission

```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T15:30:45Z",
  "uptime": 86400,
  "databases": {
    "user": { "connected": true, "fileSizeBytes": 2097152 },
    "flashpoint": { "connected": true, "fileSizeBytes": 5368709120, "lastModified": "2026-02-02T12:15:30Z" }
  },
  "cache": {
    "gameSearch": { "hits": 45230, "misses": 3421, "hitRate": 0.9296 },
    "permissions": { "hits": 12340, "misses": 234, "hitRate": 0.9812 }
  },
  "memory": { "heapUsed": 125829120, "heapTotal": 536870912 },
  "services": { "gameService": { "available": true, "url": "http://localhost:22500" } }
}
```

## Cache Endpoints

### Get Cache Statistics

`GET /api/cache/stats` - Requires `settings.view` permission

Returns cache performance metrics (gameSearch, permissions with size, hits, misses, hitRate).

### Clear Caches

`POST /api/cache/clear` - Requires `settings.update` permission

Request body: `{ "cacheType": "all" | "gameSearch" | "permissions" }`

Response: `{ "message": "Cache cleared successfully", "cleared": { ... } }`

## Database Endpoints

### Get Database Status

`GET /api/database/status` - Requires `settings.update` permission

Returns connected status, file size, game count, platform count, tag count.

### Manually Reload Database

`POST /api/database/reload` - Requires `settings.update` permission

Response: `{ "success": true, "previousGameCount": 62845, "newGameCount": 62847, "duration": 2345 }`

Error: `400 Bad Request` if reload already in progress

## Metrics Endpoints

### Get Metrics Summary

`GET /api/metrics/summary` - Requires `settings.view` permission

Returns uptime, request stats, performance percentiles, cache hit rates, error counts.

### Get Endpoint Metrics

`GET /api/metrics/endpoints` - Requires `settings.view` permission

Returns array of endpoints with method, path, call counts, response times, errors.

### Get Slowest Endpoints

`GET /api/metrics/endpoints/slowest?limit=10` - Requires `settings.view` permission

### Get Cache Metrics

`GET /api/metrics/caches` - Requires `settings.view` permission

### Get Query Statistics

`GET /api/metrics/queries` - Requires `settings.view` permission

### Reset Metrics

`POST /api/metrics/reset` - Requires `settings.update` permission

## Jobs Endpoints

### List All Jobs

`GET /api/jobs` - Requires `settings.update` permission

Returns array of background jobs with status, schedule, last run, next run.

### Get Job Status

`GET /api/jobs/:jobId` - Requires `settings.update` permission

### Enable/Disable Job

`PATCH /api/jobs/:jobId` - Requires `settings.update` permission

Body: `{ "enabled": boolean }`

### Start Job

`POST /api/jobs/:jobId/start` - Requires `settings.update` permission

Error: `409 Conflict` if job already running

### Stop Job

`POST /api/jobs/:jobId/stop` - Requires `settings.update` permission

### Trigger Job Execution

`POST /api/jobs/:jobId/trigger` - Requires `settings.update` permission

### Get Job Logs

`GET /api/jobs/:jobId/logs?limit=50&offset=0` - Requires `settings.update` permission

Returns paginated logs with timestamp, status, duration, message, details.

## Ruffle Endpoints

### Get Ruffle Version

`GET /api/ruffle/version` - No auth required

### Check for Ruffle Updates

`GET /api/ruffle/check-update` - Requires `settings.update` permission

### Update Ruffle

`POST /api/ruffle/update` - Requires `settings.update` permission

Returns `202 Accepted` (download/install in progress)

Error: `409 Conflict` if update already in progress

## Updates Endpoints

### Check for App Updates

`GET /api/updates/check` - No auth required

### Check for Metadata Updates

`GET /api/updates/metadata` - No auth required

### Start Metadata Sync

`POST /api/updates/metadata/sync` - Requires `settings.update` permission

Returns `202 Accepted`

### Get Metadata Sync Status

`GET /api/updates/metadata/sync/status` - No auth required

Returns progress percentage, stage, estimated completion time.

## GitHub Endpoints

### Get GitHub Star Count

`GET /api/github/stars` - No auth required

```json
{
  "success": true,
  "data": { "stars": 2847 }
}
```

## Statistics Endpoints

### Get Archive Statistics

`GET /api/statistics` - Requires `enableStatistics` feature flag

Returns game counts, platform distribution, archive size, user stats.

## Auth Settings Endpoints

### Get Auth Settings

`GET /api/settings/auth` - No auth required

Returns guestAccessEnabled, userRegistrationEnabled, sessionTimeoutMinutes, maxLoginAttempts, lockoutDurationMinutes.

### Update Auth Settings

`PATCH /api/settings/auth` - Requires `settings.update` permission

All fields optional. Validates ranges (sessionTimeoutMinutes: 0-10080, maxLoginAttempts: 1-10).

## Game Files Endpoint

### Get Game File

`GET /game-files/*` - No auth required

Returns file content with appropriate MIME type and CORS headers.

Uses fallback chain: Game Service → Game Service GameZip → External CDN → Local cache

Query parameter `cache=false` bypasses caching.

## Best Practices

- Check health endpoint periodically for service status
- Clear caches after direct database modifications
- Monitor slowest endpoints for performance optimization
- Use batch operations in jobs rather than individual tasks
- Check rate limit headers in responses
