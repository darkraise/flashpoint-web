# API Reference Documentation

Complete REST API reference for Flashpoint Web backend service.

## Base URL

Development: `http://localhost:3100/api`

Production: Configure via `CORS_ORIGIN` environment variable

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via the `/api/auth/login` or `/api/auth/register` endpoints.

## Response Format

All responses are in JSON format with consistent structure:

### Success Response

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "totalPages": 25
  }
}
```

### Error Response

```json
{
  "error": {
    "code": 400,
    "message": "Validation error: username must be at least 3 characters"
  }
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

## Rate Limiting

Configurable via `RATE_LIMIT_*` environment variables. Default: 100 requests per 15 minutes.

Rate limit headers included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets (Unix timestamp)

## API Endpoints by Category

### Authentication
- [POST /api/auth/login](./authentication-api.md#login)
- [POST /api/auth/register](./authentication-api.md#register)
- [POST /api/auth/refresh](./authentication-api.md#refresh-token)
- [POST /api/auth/logout](./authentication-api.md#logout)
- [GET /api/auth/me](./authentication-api.md#get-current-user)

### Games
- [GET /api/games](./games-api.md#search-games)
- [GET /api/games/filter-options](./games-api.md#get-filter-options)
- [GET /api/games/random](./games-api.md#get-random-game)
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

### Roles & Permissions
- [GET /api/roles](./roles-api.md#list-roles)
- [GET /api/roles/permissions](./roles-api.md#list-permissions)
- [GET /api/roles/:id](./roles-api.md#get-role)
- [POST /api/roles](./roles-api.md#create-role)
- [PATCH /api/roles/:id](./roles-api.md#update-role)
- [PUT /api/roles/:id/permissions](./roles-api.md#update-role-permissions)
- [DELETE /api/roles/:id](./roles-api.md#delete-role)

### Playlists
- [GET /api/playlists](./playlists-api.md#list-playlists)
- [GET /api/playlists/:id](./playlists-api.md#get-playlist)
- [POST /api/playlists](./playlists-api.md#create-playlist)
- [POST /api/playlists/:id/games](./playlists-api.md#add-games)
- [DELETE /api/playlists/:id/games](./playlists-api.md#remove-games)
- [DELETE /api/playlists/:id](./playlists-api.md#delete-playlist)

### Play Tracking
- [POST /api/play/start](./play-tracking-api.md#start-session)
- [POST /api/play/end](./play-tracking-api.md#end-session)
- [GET /api/play/stats](./play-tracking-api.md#get-user-stats)
- [GET /api/play/game-stats](./play-tracking-api.md#get-game-stats)
- [GET /api/play/history](./play-tracking-api.md#get-play-history)
- [GET /api/play/top-games](./play-tracking-api.md#get-top-games)
- [GET /api/play/activity-over-time](./play-tracking-api.md#get-activity-over-time)
- [GET /api/play/games-distribution](./play-tracking-api.md#get-games-distribution)

### Platforms & Tags
- [GET /api/platforms](./platforms-tags-api.md#list-platforms)
- [GET /api/tags](./platforms-tags-api.md#list-tags)

## Complete Examples

See [Request & Response Examples](./request-response-examples.md) for complete workflow examples including:
- User registration and login flow
- Game search with filters
- Game launch workflow
- Play session tracking
- Playlist management
- Role-based access control examples

## SDK Examples

See individual endpoint documentation for code examples in:
- curl (command line)
- JavaScript/TypeScript (axios)
- Python (requests)
- Go (net/http)

## Versioning

API version is included in response headers: `X-API-Version: 1.0.0`

Breaking changes will increment major version number.

## Support

For issues or questions:
- GitHub Issues: [flashpoint-web/issues](https://github.com/yourusername/flashpoint-web/issues)
- Documentation: [docs/README.md](../README.md)
