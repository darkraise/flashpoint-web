# Authentication API

User authentication, registration, and token management.

## Login

`POST /api/auth/login` - No auth required

Body: `{ "username": "string (3-50)", "password": "string (min 6)" }`

Returns `200 OK` with user object and access token. **Refresh token is set as
HTTP-only cookie automatically**.

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
    "expiresIn": 900
  }
}
```

Response headers also include:
```
Set-Cookie: fp_refresh=jwt...; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

Error: `401 Unauthorized` (invalid credentials) or `429 Too Many Requests`
(account locked after failed attempts)

## Register

`POST /api/auth/register` - No auth required

Body:
`{ "username": "string (3-50)", "email": "valid-email", "password": "string (min 6)" }`

Returns `201 Created` with user and tokens (same format as login). **Refresh token
is set as HTTP-only cookie automatically**.

Error: `403 Forbidden` (registration disabled) or `409 Conflict` (username/email
exists)

## Refresh Token

`POST /api/auth/refresh` - No auth required

Body: Empty object `{}` or can be omitted

**Refresh token is read from HTTP-only cookie `fp_refresh` automatically.**
The request must include credentials (cookies) to send the refresh token.

```bash
curl -X POST https://api.example.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{}' \
  --cookie "fp_refresh=jwt..."
```

Returns new `accessToken` and `expiresIn`. **New refresh token is set as HTTP-only
cookie automatically**.

```json
{
  "accessToken": "jwt...",
  "expiresIn": 900
}
```

Old refresh token automatically revoked for security (prevents token reuse).

Error: `401 Unauthorized` (invalid or expired refresh token, or no refresh token
in cookie)

## Logout

`POST /api/auth/logout` - Optional auth

Body: Empty object `{}` or can be omitted

**Refresh token is read from HTTP-only cookie `fp_refresh` automatically.**

```bash
curl -X POST https://api.example.com/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{}' \
  --cookie "fp_refresh=jwt..."
```

Revokes the refresh token and clears the HTTP-only cookie.

Returns `{ "success": true }`

## Get Current User

`GET /api/auth/me` - Requires authentication

Returns current user object with permissions array.

Error: `401 Unauthorized`

## Usage Pattern

**Frontend (with Axios client configured with `withCredentials: true`)**:

```typescript
// Login
const { data } = await api.post('/api/auth/login', {
  username: 'john_doe',
  password: 'password123',
});
// Response contains accessToken only
// Refresh token is in HTTP-only cookie (automatic, not visible to JS)

// Store access token in Zustand store (memory only)
useAuthStore.setState({ accessToken: data.tokens.accessToken });

// Subsequent requests (cookies sent automatically)
const response = await api.get('/api/games');

// On 401 - refresh automatically (cookies sent automatically)
const refreshed = await api.post('/api/auth/refresh', {});
// Response contains new accessToken only
// New refresh token is in HTTP-only cookie (automatic)

useAuthStore.setState({ accessToken: refreshed.data.accessToken });

// Logout (cookies sent automatically)
await api.post('/api/auth/logout', {});
// Refresh token cookie is cleared by backend

// Clear access token from store
useAuthStore.setState({ accessToken: null });
```

**axios configuration (required)**:

```typescript
const api = axios.create({
  baseURL: 'http://localhost:3100',
  withCredentials: true, // Enable cookies to be sent with requests
});
```

This ensures cookies are sent with every request to `/api/auth/*` endpoints.

## Security Best Practices

- Use HTTPS in production
- Access tokens (15 minutes) stored in memory only via Zustand store
- Refresh tokens (30 days) stored in HTTP-only cookies - not accessible to JavaScript
- HTTP-only cookies prevent XSS attacks from stealing refresh tokens
- Refresh tokens rotate on each use to prevent token reuse attacks
- Failed login attempts trigger rate limiting and account lockout
- Enforce strong passwords in production (minimum 6 shown, recommend 12+)
- Automatic token refresh on 401 responses via axios interceptor
- CORS with `credentials: true` ensures cookies are sent cross-origin (if applicable)

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

```typescript
// Axios interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token is sent in HTTP-only cookie automatically
        const { data } = await api.post('/api/auth/refresh', {});

        // Update access token in store (memory only)
        useAuthStore.getState().updateAccessToken(data.accessToken);

        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## Cookie Details

The `fp_refresh` HTTP-only cookie is set with the following attributes:

| Attribute | Value | Purpose |
| --------- | ----- | ------- |
| `name` | `fp_refresh` | Identifies the refresh token |
| `value` | JWT token | Refresh token |
| `httpOnly` | `true` | Not accessible to JavaScript (XSS protection) |
| `secure` | `true` (prod) | Only sent over HTTPS |
| `sameSite` | `'lax'` | CSRF protection |
| `path` | `/api/auth` | Only sent to auth endpoints |
| `maxAge` | `2592000` | 30 days (in seconds) |
| `domain` | (implicit) | Same domain as backend |

Example Set-Cookie header:
```
Set-Cookie: fp_refresh=eyJhbGc...; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```
