# Authentication API

User authentication, registration, and token management.

## Login

`POST /api/auth/login` - No auth required

Body: `{ "username": "string (3-50)", "password": "string (min 6)" }`

Returns `200 OK` with user object and tokens:

```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "permissions": ["games.play", "games.read", ...]
  },
  "tokens": {
    "accessToken": "jwt...",
    "refreshToken": "jwt...",
    "expiresIn": 3600
  }
}
```

Error: `401 Unauthorized` (invalid credentials) or `429 Too Many Requests`
(account locked after failed attempts)

## Register

`POST /api/auth/register` - No auth required

Body:
`{ "username": "string (3-50)", "email": "valid-email", "password": "string (min 6)" }`

Returns `201 Created` with user and tokens (same format as login).

Error: `403 Forbidden` (registration disabled) or `409 Conflict` (username/email
exists)

## Refresh Token

`POST /api/auth/refresh` - No auth required

Body: `{ "refreshToken": "jwt..." }`

Returns new accessToken, refreshToken (rotated), expiresIn.

Old refresh token automatically revoked for security (prevents token reuse).

Error: `401 Unauthorized` (invalid or expired refresh token)

## Logout

`POST /api/auth/logout` - Optional auth

Body: `{ "refreshToken": "jwt..." }`

Revokes the refresh token.

Returns `{ "success": true }`

## Get Current User

`GET /api/auth/me` - Requires authentication

Returns current user object with permissions array.

Error: `401 Unauthorized`

## Usage Pattern

```javascript
// Login
const { data } = await api.post('/auth/login', {
  username: 'john_doe',
  password: 'password123',
});

localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);

// Subsequent requests
const response = await api.get('/api/games');

// On 401 - refresh token
const refreshed = await api.post('/auth/refresh', {
  refreshToken: localStorage.getItem('refreshToken'),
});

localStorage.setItem('accessToken', refreshed.data.accessToken);
localStorage.setItem('refreshToken', refreshed.data.refreshToken);

// Logout
await api.post('/auth/logout', {
  refreshToken: localStorage.getItem('refreshToken'),
});

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

## Security Best Practices

- Use HTTPS in production
- Store tokens securely (httpOnly cookies recommended over localStorage)
- Access tokens expire in 1 hour (configurable)
- Refresh tokens rotate on each use
- Failed login attempts trigger rate limiting and account lockout
- Enforce strong passwords in production (minimum 6 shown, recommend 12+)
- Implement automatic token refresh on 401 responses

## Permission System

Common permissions returned in login/me:

- `games.play` - Play games
- `games.read` - View game details
- `games.download` - Download games
- `playlists.create` - Create playlists
- `playlists.update` - Modify playlists
- `playlists.delete` - Delete playlists
- `users.read` - View users (admin)
- `users.create` - Create users (admin)
- `users.update` - Modify users (admin)
- `users.delete` - Delete users (admin)
- `roles.read` - View roles (admin)
- `roles.create` - Create roles (admin)
- `roles.update` - Modify roles (admin)
- `roles.delete` - Delete roles (admin)
- `settings.read` - View settings (admin)
- `settings.update` - Modify settings (admin)

## Interceptor Pattern

```javascript
// Axios interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      error.config.headers['Authorization'] = `Bearer ${data.accessToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```
