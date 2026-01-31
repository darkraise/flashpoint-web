# Authentication API

Endpoints for user authentication, registration, and token management.

## Login

Authenticate user with username and password.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required

**Request Body:**

```json
{
  "username": "string (min: 3, max: 50)",
  "password": "string (min: 6)"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "permissions": [
      "games.play",
      "games.read",
      "playlists.create",
      "playlists.update",
      "playlists.delete"
    ],
    "themeColor": "blue-500",
    "surfaceColor": "slate-700"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Account temporarily locked due to failed login attempts

**Examples:**

```bash
# curl
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepassword123"
  }'
```

```javascript
// axios
const response = await axios.post('http://localhost:3100/api/auth/login', {
  username: 'john_doe',
  password: 'securepassword123'
});

const { user, tokens } = response.data;
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);
```

```python
# Python requests
import requests

response = requests.post('http://localhost:3100/api/auth/login', json={
    'username': 'john_doe',
    'password': 'securepassword123'
})

data = response.json()
access_token = data['tokens']['accessToken']
```

---

## Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Authentication:** Not required

**Note:** Registration may be disabled by system administrators. Check `GET /api/auth-settings` endpoint.

**Request Body:**

```json
{
  "username": "string (min: 3, max: 50)",
  "email": "string (valid email)",
  "password": "string (min: 6)"
}
```

**Response:** `201 Created`

```json
{
  "user": {
    "id": 2,
    "username": "jane_smith",
    "email": "jane@example.com",
    "role": "user",
    "permissions": [
      "games.play",
      "games.read",
      "playlists.create",
      "playlists.update",
      "playlists.delete"
    ],
    "themeColor": "blue-500",
    "surfaceColor": "slate-700"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `403 Forbidden` - User registration disabled
- `409 Conflict` - Username or email already exists

**Examples:**

```bash
# curl
curl -X POST http://localhost:3100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_smith",
    "email": "jane@example.com",
    "password": "securepassword123"
  }'
```

```javascript
// axios
const response = await axios.post('http://localhost:3100/api/auth/register', {
  username: 'jane_smith',
  email: 'jane@example.com',
  password: 'securepassword123'
});

const { user, tokens } = response.data;
```

---

## Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Authentication:** Not required (uses refresh token)

**Security Note:** When a refresh token is used to generate new tokens, the old refresh token is automatically revoked for security. This prevents token reuse attacks and ensures that only the most recent refresh token is valid.

**Request Body:**

```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid or expired refresh token

**Examples:**

```bash
# curl
curl -X POST http://localhost:3100/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

```javascript
// axios - Automatic token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
      return axios(originalRequest);
    }

    return Promise.reject(error);
  }
);
```

---

## Logout

Revoke a refresh token and end the session.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Not required (but should include refresh token)

**Request Body:**

```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error

**Examples:**

```bash
# curl
curl -X POST http://localhost:3100/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

```javascript
// axios
const refreshToken = localStorage.getItem('refreshToken');

await axios.post('http://localhost:3100/api/auth/logout', {
  refreshToken
});

// Clear local storage
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

---

## Get Current User

Get the currently authenticated user's information.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required (JWT Bearer token)

**Response:** `200 OK`

```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "permissions": [
    "games.play",
    "games.read",
    "playlists.create",
    "playlists.update",
    "playlists.delete"
  ],
  "themeColor": "blue-500",
  "surfaceColor": "slate-700"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token

**Examples:**

```bash
# curl
curl -X GET http://localhost:3100/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

```javascript
// axios with interceptor
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const { data: user } = await axios.get('http://localhost:3100/api/auth/me');
```

---

## Authentication Flow

### Initial Login Flow

1. User submits credentials to `POST /api/auth/login`
2. Server validates credentials and generates tokens
3. Client stores both access and refresh tokens
4. Client includes access token in all subsequent requests

### Token Refresh Flow

1. Client receives 401 error from API
2. Client sends refresh token to `POST /api/auth/refresh`
3. Server validates refresh token and issues new tokens
4. Client updates stored tokens
5. Client retries original request with new access token

### Logout Flow

1. Client sends refresh token to `POST /api/auth/logout`
2. Server revokes the refresh token
3. Client clears all stored tokens
4. Client redirects to login page

## Security Best Practices

1. **HTTPS Only**: Always use HTTPS in production
2. **Secure Storage**: Store tokens in httpOnly cookies or secure storage (not localStorage in production)
3. **Token Expiry**: Access tokens expire in 1 hour by default
4. **Refresh Rotation**: Refresh tokens are rotated on each use
5. **Automatic Token Revocation**: Old refresh tokens are automatically revoked when new tokens are issued
6. **Login Throttling**: Failed login attempts trigger temporary lockout
7. **Password Requirements**: Minimum 6 characters (configure stronger requirements in production)
8. **Permission Caching**: Permissions are cached for up to 5 minutes for performance; critical changes should clear cache manually

## Permission System

Permissions are returned in the authentication response. Common permissions include:

- `games.play` - Play games in browser
- `games.read` - View game details
- `playlists.create` - Create playlists
- `playlists.update` - Modify own playlists
- `playlists.delete` - Delete own playlists
- `users.read` - View user list (admin)
- `users.create` - Create users (admin)
- `users.update` - Modify users (admin)
- `users.delete` - Delete users (admin)
- `roles.read` - View roles (admin)
- `roles.create` - Create roles (admin)
- `roles.update` - Modify roles (admin)
- `roles.delete` - Delete roles (admin)

Check user permissions before allowing actions in your application.
