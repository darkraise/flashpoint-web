# API Reference Documentation

Complete REST API reference for Flashpoint Web backend service.

## Base URL

Development: `http://localhost:3100/api` Production: Configure via `DOMAIN`
environment variable

## Authentication

Most endpoints require JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

Obtain tokens via `/api/auth/login` or `/api/auth/register`.

## Response Format

### Success Response

```json
{
  "data": { ... },
  "pagination": { "page": 1, "limit": 50, "total": 1234, "totalPages": 25 }
}
```

### Error Response

```json
{
  "error": { "code": 400, "message": "Validation error: ..." }
}
```

## HTTP Status Codes

- `200 OK` - Successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource exists
- `500 Internal Server Error` - Server error

## Rate Limiting

Default: 100 requests per 15 minutes. Headers: `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## API Endpoints

### Authentication

- [POST /api/auth/login](./authentication-api.md#login)
- [POST /api/auth/register](./authentication-api.md#register)
- [POST /api/auth/refresh](./authentication-api.md#refresh-token)
- [POST /api/auth/logout](./authentication-api.md#logout)
- [GET /api/auth/me](./authentication-api.md#get-current-user)
- [GET /api/auth/setup-status](./authentication-api.md#check-setup-status)

### Games

- [GET /api/games](./games-api.md#search-games)
- [GET /api/games/filter-options](./games-api.md#get-filter-options)
- [GET /api/games/random](./games-api.md#get-random-game)
- [GET /api/games/most-played](./games-api.md#get-most-played-games)
- [GET /api/games/:id](./games-api.md#get-game-details)
- [GET /api/games/:id/launch](./games-api.md#get-launch-data)
- [GET /api/games/:id/related](./games-api.md#get-related-games)

### Users

- [GET /api/users](./users-api.md#list-users)
- [GET /api/users/:id](./users-api.md#get-user)
- [POST /api/users](./users-api.md#create-user)
- [PATCH /api/users/:id](./users-api.md#update-user)
- [DELETE /api/users/:id](./users-api.md#delete-user)
- [POST /api/users/:id/change-password](./users-api.md#change-password)
- [GET /api/users/me/settings](./users-api.md#get-user-settings)
- [PATCH /api/users/me/settings](./users-api.md#update-user-settings)
- [GET /api/users/me/theme](./users-api.md#get-theme-settings)
- [PATCH /api/users/me/theme](./users-api.md#update-theme-settings)

### Roles & Permissions

- [GET /api/roles](./roles-api.md#list-roles)
- [GET /api/roles/permissions](./roles-api.md#list-permissions)
- [GET /api/roles/:id](./roles-api.md#get-role)
- [POST /api/roles](./roles-api.md#create-role)
- [PATCH /api/roles/:id](./roles-api.md#update-role)
- [PUT /api/roles/:id/permissions](./roles-api.md#update-role-permissions)
- [DELETE /api/roles/:id](./roles-api.md#delete-role)

### Playlists (Flashpoint)

- [GET /api/playlists](./playlists-api.md#list-playlists)
- [GET /api/playlists/:id](./playlists-api.md#get-playlist)
- [POST /api/playlists](./playlists-api.md#create-playlist)
- [POST /api/playlists/:id/games](./playlists-api.md#add-games)
- [DELETE /api/playlists/:id/games](./playlists-api.md#remove-games)
- [DELETE /api/playlists/:id](./playlists-api.md#delete-playlist)

### User Playlists

- [GET /api/user-playlists](./user-playlists-api.md#list-user-playlists)
- [GET /api/user-playlists/stats](./user-playlists-api.md#get-playlist-statistics)
- [GET /api/user-playlists/:id](./user-playlists-api.md#get-single-playlist)
- [POST /api/user-playlists](./user-playlists-api.md#create-playlist)
- [PATCH /api/user-playlists/:id](./user-playlists-api.md#update-playlist)
- [DELETE /api/user-playlists/:id](./user-playlists-api.md#delete-playlist)
- [POST /api/user-playlists/:id/games](./user-playlists-api.md#add-games-to-playlist)
- [DELETE /api/user-playlists/:id/games](./user-playlists-api.md#remove-games-from-playlist)
- [POST /api/user-playlists/:id/share/enable](./user-playlists-api.md#enable-sharing)
- [POST /api/user-playlists/:id/share/disable](./user-playlists-api.md#disable-sharing)
- [POST /api/user-playlists/copy-flashpoint](./user-playlists-api.md#copy-flashpoint-playlist)

### Favorites

- [GET /api/favorites](./favorites-api.md#get-all-favorites)
- [GET /api/favorites/game-ids](./favorites-api.md#get-favorite-game-ids)
- [GET /api/favorites/games](./favorites-api.md#get-favorites-with-full-game-data)
- [GET /api/favorites/stats](./favorites-api.md#get-favorites-statistics)
- [POST /api/favorites/toggle](./favorites-api.md#toggle-favorite-status)
- [POST /api/favorites](./favorites-api.md#add-game-to-favorites)
- [DELETE /api/favorites/:gameId](./favorites-api.md#remove-game-from-favorites)
- [POST /api/favorites/batch](./favorites-api.md#batch-add-favorites)
- [DELETE /api/favorites/batch](./favorites-api.md#batch-remove-favorites)
- [DELETE /api/favorites](./favorites-api.md#clear-all-favorites)

### Play Tracking

- [POST /api/play/start](./play-tracking-api.md#start-session)
- [POST /api/play/end](./play-tracking-api.md#end-session)
- [GET /api/play/stats](./play-tracking-api.md#get-user-stats)
- [GET /api/play/game-stats](./play-tracking-api.md#get-game-stats)
- [GET /api/play/history](./play-tracking-api.md#get-play-history)
- [GET /api/play/top-games](./play-tracking-api.md#get-top-games)
- [GET /api/play/activity-over-time](./play-tracking-api.md#get-activity-over-time)
- [GET /api/play/games-distribution](./play-tracking-api.md#get-games-distribution)

### Shared Playlists

- [GET /api/shared-playlists/:shareToken](./shared-playlists-api.md#get-shared-playlist)
- [GET /api/shared-playlists/:shareToken/games](./shared-playlists-api.md#get-shared-playlist-games)
- [GET /api/shared-playlists/:shareToken/games/:gameId/validate](./shared-playlists-api.md#validate-game-access)
- [POST /api/shared-playlists/:shareToken/generate-access-token](./shared-playlists-api.md#generate-access-token)
- [POST /api/shared-playlists/:shareToken/clone](./shared-playlists-api.md#clone-shared-playlist)

### Community Playlists

- [GET /api/community-playlists](./community-playlists-api.md#browse-community-playlists)
- [POST /api/community-playlists/download](./community-playlists-api.md#download-community-playlist)

### Downloads

- [POST /api/downloads/:id/download](./downloads-api.md#start-download)
- [GET /api/downloads/:id/download/progress](./downloads-api.md#get-download-progress)
- [DELETE /api/downloads/:id/download](./downloads-api.md#cancel-download)

### Jobs

- [GET /api/jobs](./jobs-api.md#list-all-jobs)
- [GET /api/jobs/logs/all](./jobs-api.md#get-all-job-logs)
- [GET /api/jobs/:jobId](./jobs-api.md#get-job-details)
- [PATCH /api/jobs/:jobId](./jobs-api.md#update-job)
- [POST /api/jobs/:jobId/start](./jobs-api.md#start-job-scheduler)
- [POST /api/jobs/:jobId/stop](./jobs-api.md#stop-job-scheduler)
- [POST /api/jobs/:jobId/trigger](./jobs-api.md#trigger-job-manually)
- [GET /api/jobs/:jobId/logs](./jobs-api.md#get-job-execution-logs)

### Platforms & Tags

- [GET /api/platforms](./platforms-tags-api.md#list-platforms)
- [GET /api/tags](./platforms-tags-api.md#list-tags)

### Activities & Audit Logs

- [GET /api/activities](./activities-api.md#list-activity-logs)
- [GET /api/activities/stats](./activities-api.md#get-activity-statistics)
- [GET /api/activities/trend](./activities-api.md#get-activity-trend)
- [GET /api/activities/top-actions](./activities-api.md#get-top-actions)
- [GET /api/activities/breakdown](./activities-api.md#get-activity-breakdown)

### Admin & Operations

- [GET /api/health](./admin-api.md#basic-health-check)
- [GET /api/health/detailed](./admin-api.md#detailed-health-check)
- [GET /api/cache/stats](./admin-api.md#get-cache-statistics)
- [POST /api/cache/clear](./admin-api.md#clear-caches)
- [GET /api/database/status](./admin-api.md#get-database-status)
- [POST /api/database/reload](./admin-api.md#manually-reload-database)
- [GET /api/metrics/summary](./admin-api.md#get-metrics-summary)
- [GET /api/metrics/endpoints](./admin-api.md#get-endpoint-metrics)
- [GET /api/jobs](./admin-api.md#list-all-jobs)
- [GET /api/github/stars](./admin-api.md#get-github-star-count)
- [GET /api/settings/auth](./admin-api.md#get-auth-settings)
- [PATCH /api/settings/auth](./admin-api.md#update-auth-settings)
- [GET /game-files/\*](./admin-api.md#get-game-file)

### Domains

- [GET /api/domains](./domains-api.md#list-domains)
- [POST /api/domains](./domains-api.md#add-domain)
- [DELETE /api/domains/:id](./domains-api.md#delete-domain)
- [PATCH /api/domains/:id/default](./domains-api.md#set-default-domain)

### System Settings

- [GET /api/settings](./settings-api.md#get-all-settings)
- [GET /api/settings/:category](./settings-api.md#get-category-settings)
- [PATCH /api/settings/:category](./settings-api.md#update-category-settings)
- [PATCH /api/settings/:category/:key](./settings-api.md#update-single-setting)
- [GET /api/settings/_cache/stats](./settings-api.md#get-cache-stats)
- [POST /api/settings/_cache/clear](./settings-api.md#clear-settings-cache)
- [GET /api/settings/_cache/permissions/stats](./settings-api.md#get-permission-cache-stats)
- [POST /api/settings/_cache/permissions/clear](./settings-api.md#clear-permission-cache)

## Support

For issues: [GitHub Issues](https://github.com/darkraise/flashpoint-web/issues)
Documentation: [docs/README.md](../README.md)
