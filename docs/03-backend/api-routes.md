# API Routes Documentation

Complete reference for all backend API endpoints.

## Base URL

```
http://localhost:3100/api
```

## Authentication

Most endpoints require authentication via JWT Bearer token:

```http
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Authentication Routes

### POST /auth/login

Login with username and password.

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@flashpoint.local",
    "role": "admin",
    "permissions": ["games.read", "games.play", ...]
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresIn": 3600
  }
}
```

**Validation**:
- `username`: 3-50 characters
- `password`: Minimum 6 characters

**Errors**:
- `401` - Invalid credentials
- `429` - Too many failed attempts (lockout)

---

### POST /auth/register

Register a new user account.

**Request Body**:
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["games.read", "games.play", ...]
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

**Validation**:
- `username`: 3-50 characters, unique
- `email`: Valid email format, unique
- `password`: Minimum 6 characters

**Errors**:
- `403` - Registration disabled
- `409` - Username or email already exists

---

### POST /auth/logout

Logout and revoke refresh token.

**Request Body**:
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-refresh-token...",
  "expiresIn": 3600
}
```

**Errors**:
- `401` - Invalid or expired refresh token

---

### GET /auth/me

Get current authenticated user information.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@flashpoint.local",
  "role": "admin",
  "permissions": ["games.read", "games.play", ...]
}
```

---

## User Management Routes

### GET /users

List all users with pagination.

**Auth**: Required
**Permission**: `users.read`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 50, max: 100)

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@flashpoint.local",
      "roleId": 1,
      "roleName": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastLoginAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

### GET /users/:id

Get single user by ID.

**Auth**: Required
**Permission**: `users.read`

**Response** (200):
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@flashpoint.local",
  "roleId": 1,
  "roleName": "admin",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "lastLoginAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors**:
- `404` - User not found

---

### POST /users

Create new user (admin only).

**Auth**: Required
**Permission**: `users.create`

**Request Body**:
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "roleId": 2,
  "isActive": true
}
```

**Response** (201):
```json
{
  "id": 2,
  "username": "newuser",
  "email": "user@example.com",
  "roleId": 2,
  "roleName": "user",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Errors**:
- `409` - Username or email already exists

---

### PATCH /users/:id

Update existing user.

**Auth**: Required
**Permission**: `users.update`

**Request Body**:
```json
{
  "email": "newemail@example.com",
  "roleId": 3,
  "isActive": false
}
```

**Response** (200):
```json
{
  "id": 2,
  "username": "newuser",
  "email": "newemail@example.com",
  "roleId": 3,
  "roleName": "moderator",
  "isActive": false,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

### DELETE /users/:id

Delete user (prevents deleting last admin).

**Auth**: Required
**Permission**: `users.delete`

**Response** (200):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Errors**:
- `403` - Cannot delete last admin
- `404` - User not found

---

### POST /users/:id/change-password

Change user password. Users can change their own password, admins can change any password.

**Auth**: Required

**Request Body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors**:
- `401` - Current password incorrect
- `403` - Insufficient permissions

---

### GET /users/me/settings

Get all settings for current user.

**Auth**: Required

**Response** (200):
```json
{
  "theme_mode": "dark",
  "primary_color": "blue",
  "sidebar_collapsed": "false"
}
```

---

### PATCH /users/me/settings

Update multiple settings for current user.

**Auth**: Required

**Request Body**:
```json
{
  "theme_mode": "light",
  "primary_color": "green",
  "sidebar_collapsed": "true"
}
```

**Response** (200):
```json
{
  "theme_mode": "light",
  "primary_color": "green",
  "sidebar_collapsed": "true"
}
```

---

## Game Routes

### GET /games

Search and filter games with pagination.

**Auth**: Optional (guest access if enabled)
**Permission**: `games.read`

**Query Parameters**:
- `search` (string) - Search in title, developer, publisher
- `platforms[]` (string[]) - Filter by platform names
- `series[]` (string[]) - Filter by series names
- `developers[]` (string[]) - Filter by developers
- `publishers[]` (string[]) - Filter by publishers
- `playModes[]` (string[]) - Filter by play modes
- `languages[]` (string[]) - Filter by languages
- `library` (string) - Filter by library (arcade, theatre)
- `tags[]` (string[]) - Filter by tags
- `yearFrom` (number) - Filter by release year (min)
- `yearTo` (number) - Filter by release year (max)
- `showBroken` (boolean, default: false) - Include broken games
- `showExtreme` (boolean, default: false) - Include adult content
- `sortBy` (string, default: title) - Sort column
- `sortOrder` (asc|desc, default: asc) - Sort direction
- `page` (number, default: 1)
- `limit` (number, default: 50, max: 100)

**Response** (200):
```json
{
  "data": [
    {
      "id": "12345-abcd-6789",
      "title": "Game Title",
      "developer": "Developer Name",
      "publisher": "Publisher Name",
      "platformName": "Flash",
      "library": "arcade",
      "releaseDate": "2010-05-15",
      "tagsStr": "Action;Adventure;Platformer",
      "logoPath": "Logos/1/12345-abcd-6789.png",
      "screenshotPath": "Screenshots/1/12345-abcd-6789.png",
      "presentOnDisk": 1,
      "lastPlayed": "2024-01-15T10:00:00.000Z",
      "playtime": 3600,
      "playCounter": 5
    }
  ],
  "total": 1000,
  "page": 1,
  "limit": 50,
  "totalPages": 20
}
```

---

### GET /games/:id

Get single game by ID with all details.

**Auth**: Optional
**Permission**: `games.read`

**Response** (200):
```json
{
  "id": "12345-abcd-6789",
  "title": "Game Title",
  "alternateTitles": "Alternate Title",
  "series": "Game Series",
  "developer": "Developer Name",
  "publisher": "Publisher Name",
  "platformName": "Flash",
  "playMode": "Single Player",
  "status": "Playable",
  "broken": false,
  "extreme": false,
  "notes": "Game notes",
  "tagsStr": "Action;Adventure",
  "source": "https://example.com",
  "launchCommand": "http://example.com/game.swf",
  "releaseDate": "2010-05-15",
  "version": "1.0",
  "originalDescription": "Game description",
  "language": "English",
  "library": "arcade",
  "logoPath": "Logos/1/12345-abcd-6789.png",
  "screenshotPath": "Screenshots/1/12345-abcd-6789.png",
  "presentOnDisk": 1,
  "lastPlayed": "2024-01-15T10:00:00.000Z",
  "playtime": 3600,
  "playCounter": 5
}
```

**Errors**:
- `404` - Game not found

---

### GET /games/:id/related

Get related games (same developer or platform).

**Auth**: Optional
**Permission**: `games.read`

**Query Parameters**:
- `limit` (number, default: 10, max: 50)

**Response** (200):
```json
[
  {
    "id": "67890-efgh-1234",
    "title": "Related Game",
    "developer": "Developer Name",
    "platformName": "Flash",
    ...
  }
]
```

---

### GET /games/random

Get a random game.

**Auth**: Optional
**Permission**: `games.read`

**Query Parameters**:
- `library` (string, optional) - Filter by library

**Response** (200):
```json
{
  "id": "12345-abcd-6789",
  "title": "Random Game",
  ...
}
```

---

### GET /games/filter-options

Get all filter options for dropdowns (series, developers, platforms, etc.).

**Auth**: Optional
**Permission**: `games.read`

**Response** (200):
```json
{
  "series": [
    { "name": "Game Series", "count": 50 }
  ],
  "developers": [
    { "name": "Developer Name", "count": 100 }
  ],
  "publishers": [
    { "name": "Publisher Name", "count": 75 }
  ],
  "playModes": [
    { "name": "Single Player", "count": 1000 },
    { "name": "Multiplayer", "count": 200 }
  ],
  "languages": [
    { "name": "English", "count": 5000 }
  ],
  "tags": [
    { "name": "Action", "count": 500 }
  ],
  "platforms": [
    { "name": "Flash", "count": 10000 },
    { "name": "HTML5", "count": 2000 }
  ],
  "yearRange": {
    "min": 1990,
    "max": 2024
  }
}
```

---

## Play Tracking Routes

All play tracking routes require authentication.

### POST /play/start

Start a new play session.

**Auth**: Required
**Permission**: `games.play`

**Request Body**:
```json
{
  "gameId": "12345-abcd-6789",
  "gameTitle": "Game Title"
}
```

**Response** (200):
```json
{
  "success": true,
  "sessionId": "a1b2c3d4e5f6..."
}
```

---

### POST /play/end

End a play session.

**Auth**: Required

**Request Body**:
```json
{
  "sessionId": "a1b2c3d4e5f6..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Play session ended successfully"
}
```

---

### GET /play/stats

Get current user's overall play statistics.

**Auth**: Required

**Response** (200):
```json
{
  "userId": 1,
  "totalGamesPlayed": 50,
  "totalPlaytimeSeconds": 36000,
  "totalSessions": 150,
  "firstPlayAt": "2024-01-01T00:00:00.000Z",
  "lastPlayAt": "2024-01-15T10:00:00.000Z"
}
```

---

### GET /play/game-stats

Get current user's per-game statistics.

**Auth**: Required

**Query Parameters**:
- `limit` (number, default: 50, max: 100)
- `offset` (number, default: 0)

**Response** (200):
```json
{
  "data": [
    {
      "gameId": "12345-abcd-6789",
      "gameTitle": "Game Title",
      "totalPlays": 5,
      "totalPlaytimeSeconds": 3600,
      "firstPlayedAt": "2024-01-10T00:00:00.000Z",
      "lastPlayedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

---

### GET /play/history

Get current user's play session history.

**Auth**: Required

**Query Parameters**:
- `limit` (number, default: 50, max: 100)
- `offset` (number, default: 0)

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "gameId": "12345-abcd-6789",
      "gameTitle": "Game Title",
      "startedAt": "2024-01-15T10:00:00.000Z",
      "endedAt": "2024-01-15T11:00:00.000Z",
      "durationSeconds": 3600,
      "sessionId": "a1b2c3d4e5f6..."
    }
  ],
  "limit": 50,
  "offset": 0
}
```

---

### GET /play/top-games

Get current user's top played games by playtime.

**Auth**: Required

**Query Parameters**:
- `limit` (number, default: 10, max: 50)

**Response** (200):
```json
[
  {
    "gameId": "12345-abcd-6789",
    "gameTitle": "Game Title",
    "totalPlays": 10,
    "totalPlaytimeSeconds": 7200,
    "firstPlayedAt": "2024-01-01T00:00:00.000Z",
    "lastPlayedAt": "2024-01-15T00:00:00.000Z"
  }
]
```

---

### GET /play/activity-over-time

Get play activity over time (daily aggregation).

**Auth**: Required

**Query Parameters**:
- `days` (number, default: 30, max: 365)

**Response** (200):
```json
[
  {
    "date": "2024-01-15",
    "playtime": 3600,
    "sessions": 5
  }
]
```

---

### GET /play/games-distribution

Get games distribution by playtime (for pie charts).

**Auth**: Required

**Query Parameters**:
- `limit` (number, default: 10, max: 20)

**Response** (200):
```json
[
  {
    "name": "Game Title",
    "value": 7200
  }
]
```

---

## Role & Permission Routes

### GET /roles

Get all roles with their permissions.

**Auth**: Required
**Permission**: `roles.read`

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "admin",
    "description": "Administrator with full access",
    "priority": 100,
    "permissions": [
      {
        "id": 1,
        "name": "games.read",
        "description": "View and browse games",
        "resource": "games",
        "action": "read"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### GET /roles/:id

Get single role with permissions.

**Auth**: Required
**Permission**: `roles.read`

**Response** (200):
```json
{
  "id": 1,
  "name": "admin",
  "description": "Administrator with full access",
  "priority": 100,
  "permissions": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /roles/permissions

Get all available permissions.

**Auth**: Required
**Permission**: `roles.read`

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "games.read",
    "description": "View and browse games",
    "resource": "games",
    "action": "read"
  }
]
```

---

## Activity Log Routes

### GET /activities

Get activity logs with pagination and filtering.

**Auth**: Required
**Permission**: `activities.read`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 50, max: 100)
- `userId` (number, optional) - Filter by user
- `action` (string, optional) - Filter by action
- `resource` (string, optional) - Filter by resource
- `dateFrom` (string, optional) - Filter by date (ISO format)
- `dateTo` (string, optional) - Filter by date (ISO format)

**Response** (200):
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "username": "admin",
      "action": "login",
      "resource": "auth",
      "resourceId": null,
      "details": null,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

---

## Platform Routes

### GET /platforms

Get all platforms.

**Auth**: Optional

**Response** (200):
```json
[
  {
    "name": "Flash",
    "count": 10000
  },
  {
    "name": "HTML5",
    "count": 2000
  }
]
```

---

## Tag Routes

### GET /tags

Get all tags with game counts.

**Auth**: Optional

**Response** (200):
```json
[
  {
    "name": "Action",
    "count": 500
  },
  {
    "name": "Adventure",
    "count": 300
  }
]
```

---

## Utility Routes

### GET /health

Server health check (no authentication required).

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "flashpointPath": "D:/Flashpoint",
  "databaseConnected": true,
  "gameServiceUrl": "http://localhost:22500"
}
```

---

## Rate Limiting

Default rate limits:
- **Window**: 60 seconds
- **Max requests**: 100 per window

Exceeding rate limit returns:
```json
{
  "error": {
    "message": "Too many requests, please try again later",
    "statusCode": 429
  }
}
```

## CORS

CORS is configured to allow requests from the configured frontend origin (default: `http://localhost:5173`).

Allowed headers:
- `Authorization`
- `Content-Type`

Allowed methods:
- `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`

## Pagination

Paginated endpoints follow this pattern:

**Request**:
```
GET /api/users?page=2&limit=25
```

**Response**:
```json
{
  "data": [...],
  "total": 100,
  "page": 2,
  "limit": 25,
  "totalPages": 4
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "message": "Descriptive error message",
    "statusCode": 400
  }
}
```

Common error scenarios:
- **Validation errors**: Include field and reason
- **Authentication errors**: Include "No token provided" or "Invalid token"
- **Authorization errors**: "Insufficient permissions"
- **Not found errors**: "{Resource} not found"

## Related Documentation

- [Authentication Service](./services/auth-service.md)
- [RBAC Middleware](./middleware/rbac.md)
- [Error Handling](./middleware/error-handling.md)
