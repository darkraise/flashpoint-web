# Users API

Endpoints for user management, profile settings, and preferences.

## List Users

Get a paginated list of all users.

**Endpoint:** `GET /api/users`

**Authentication:** Required

**Permissions:** `users.read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` | Items per page |

**Response:** `200 OK`

```json
{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "roleId": 2,
      "roleName": "user",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-03-20T14:25:00Z"
    },
    {
      "id": 2,
      "username": "jane_admin",
      "email": "jane@example.com",
      "roleId": 1,
      "roleName": "admin",
      "isActive": true,
      "createdAt": "2024-01-10T08:00:00Z",
      "lastLoginAt": "2024-03-21T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

**Examples:**

```bash
curl http://localhost:3100/api/users \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data } = await axios.get('http://localhost:3100/api/users', {
  headers: { Authorization: `Bearer ${token}` },
  params: { page: 1, limit: 20 }
});
```

---

## Get User

Get details of a specific user by ID.

**Endpoint:** `GET /api/users/:id`

**Authentication:** Required

**Permissions:** `users.read`

**URL Parameters:**

- `id` (integer, required) - User ID

**Response:** `200 OK`

```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "roleId": 2,
  "roleName": "user",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2024-03-20T14:25:00Z",
  "permissions": [
    "games.play",
    "games.read",
    "playlists.create",
    "playlists.update",
    "playlists.delete"
  ]
}
```

**Error Responses:**

- `404 Not Found` - User not found

**Examples:**

```bash
curl http://localhost:3100/api/users/1 \
  -H "Authorization: Bearer <token>"
```

```javascript
const userId = 1;
const { data: user } = await axios.get(
  `http://localhost:3100/api/users/${userId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Create User

Create a new user account (admin only).

**Endpoint:** `POST /api/users`

**Authentication:** Required

**Permissions:** `users.create`

**Request Body:**

```json
{
  "username": "string (min: 3, max: 50)",
  "email": "string (valid email)",
  "password": "string (min: 6)",
  "roleId": "integer (positive)",
  "isActive": "boolean (optional, default: true)"
}
```

**Response:** `201 Created`

```json
{
  "id": 3,
  "username": "new_user",
  "email": "newuser@example.com",
  "roleId": 2,
  "roleName": "user",
  "isActive": true,
  "createdAt": "2024-03-21T10:00:00Z",
  "lastLoginAt": null
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `409 Conflict` - Username or email already exists

**Examples:**

```bash
curl -X POST http://localhost:3100/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_user",
    "email": "newuser@example.com",
    "password": "securepass123",
    "roleId": 2,
    "isActive": true
  }'
```

```javascript
const newUser = await axios.post(
  'http://localhost:3100/api/users',
  {
    username: 'new_user',
    email: 'newuser@example.com',
    password: 'securepass123',
    roleId: 2,
    isActive: true
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Update User

Update an existing user's information.

**Endpoint:** `PATCH /api/users/:id`

**Authentication:** Required

**Permissions:** `users.update`

**URL Parameters:**

- `id` (integer, required) - User ID

**Request Body:**

All fields are optional:

```json
{
  "email": "string (valid email, optional)",
  "roleId": "integer (positive, optional)",
  "isActive": "boolean (optional)"
}
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "username": "john_doe",
  "email": "newemail@example.com",
  "roleId": 3,
  "roleName": "moderator",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2024-03-20T14:25:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `404 Not Found` - User not found
- `409 Conflict` - Email already exists

**Examples:**

```bash
curl -X PATCH http://localhost:3100/api/users/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "roleId": 3
  }'
```

```javascript
const userId = 1;
const { data: updatedUser } = await axios.patch(
  `http://localhost:3100/api/users/${userId}`,
  {
    email: 'newemail@example.com',
    roleId: 3
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Delete User

Delete a user account. Cannot delete the last admin user.

**Endpoint:** `DELETE /api/users/:id`

**Authentication:** Required

**Permissions:** `users.delete`

**URL Parameters:**

- `id` (integer, required) - User ID

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Cannot delete last admin
- `404 Not Found` - User not found

**Examples:**

```bash
curl -X DELETE http://localhost:3100/api/users/3 \
  -H "Authorization: Bearer <token>"
```

```javascript
const userId = 3;
await axios.delete(
  `http://localhost:3100/api/users/${userId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Change Password

Change a user's password. Users can change their own password, or admins can change any password.

**Endpoint:** `POST /api/users/:id/change-password`

**Authentication:** Required

**Permissions:** Own password (any user) or `users.update` (admin)

**URL Parameters:**

- `id` (integer, required) - User ID

**Request Body:**

```json
{
  "currentPassword": "string (min: 6)",
  "newPassword": "string (min: 6)"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Current password incorrect
- `403 Forbidden` - Insufficient permissions (not own account or admin)
- `404 Not Found` - User not found

**Examples:**

```bash
curl -X POST http://localhost:3100/api/users/1/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword456"
  }'
```

```javascript
const userId = 1;
await axios.post(
  `http://localhost:3100/api/users/${userId}/change-password`,
  {
    currentPassword: 'oldpassword123',
    newPassword: 'newpassword456'
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Get User Settings

Get all settings for the current user.

**Endpoint:** `GET /api/users/me/settings`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "theme_mode": "dark",
  "primary_color": "blue",
  "game_view_mode": "grid",
  "games_per_page": "50",
  "auto_play_next": "false",
  "show_extreme_content": "false"
}
```

**Note:** Settings are stored as key-value pairs (string values). Convert as needed in your application.

**Examples:**

```bash
curl http://localhost:3100/api/users/me/settings \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: settings } = await axios.get(
  'http://localhost:3100/api/users/me/settings',
  { headers: { Authorization: `Bearer ${token}` } }
);

// Convert to typed values
const userSettings = {
  themeMode: settings.theme_mode,
  primaryColor: settings.primary_color,
  gamesPerPage: parseInt(settings.games_per_page),
  autoPlayNext: settings.auto_play_next === 'true'
};
```

---

## Update User Settings

Update multiple settings for the current user.

**Endpoint:** `PATCH /api/users/me/settings`

**Authentication:** Required

**Request Body:**

Key-value pairs of settings to update:

```json
{
  "theme_mode": "dark",
  "primary_color": "purple",
  "games_per_page": "100",
  "show_extreme_content": "true"
}
```

**Response:** `200 OK`

```json
{
  "theme_mode": "dark",
  "primary_color": "purple",
  "game_view_mode": "grid",
  "games_per_page": "100",
  "auto_play_next": "false",
  "show_extreme_content": "true"
}
```

**Examples:**

```bash
curl -X PATCH http://localhost:3100/api/users/me/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "theme_mode": "dark",
    "primary_color": "purple",
    "games_per_page": "100"
  }'
```

```javascript
await axios.patch(
  'http://localhost:3100/api/users/me/settings',
  {
    theme_mode: 'dark',
    primary_color: 'purple',
    games_per_page: '100',
    show_extreme_content: 'true'
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Common User Settings

| Setting Key | Type | Default | Description |
|-------------|------|---------|-------------|
| `theme_mode` | enum | `dark` | Theme mode: "light", "dark", "system" |
| `primary_color` | string | `blue` | Primary color name |
| `game_view_mode` | enum | `grid` | View mode: "grid", "list" |
| `games_per_page` | string | `50` | Games per page (store as string) |
| `auto_play_next` | boolean | `false` | Auto-play next game in playlist |
| `show_extreme_content` | boolean | `false` | Show extreme content in search |
| `show_broken_games` | boolean | `false` | Show broken games in search |
| `default_library` | enum | - | Default library: "arcade", "theatre" |
| `player_scale_mode` | enum | `showall` | Ruffle scale mode |
| `enable_sound` | boolean | `true` | Enable game sound |

All setting values are stored as strings in the database. Convert to appropriate types in your application.

---

## Deprecated Endpoints

The following endpoints are deprecated but still functional for backward compatibility:

### GET /api/users/me/theme

**Deprecated:** Use `GET /api/users/me/settings` instead.

Returns theme settings in legacy format:

```json
{
  "themeColor": "blue-500",
  "surfaceColor": "slate-700"
}
```

### PATCH /api/users/me/theme

**Deprecated:** Use `PATCH /api/users/me/settings` with `theme_mode` and `primary_color` keys.

### GET /api/users/me/settings/theme

**Deprecated:** Use `GET /api/users/me/settings` instead.

### PATCH /api/users/me/settings/theme

**Deprecated:** Use `PATCH /api/users/me/settings` instead.

---

## User Management Best Practices

### Password Security

1. Enforce minimum password length (6+ characters, recommend 12+)
2. Hash passwords with bcrypt (automatically handled by backend)
3. Never log or display passwords
4. Use HTTPS for all password-related requests

### Role Assignment

1. Use role IDs from `GET /api/roles` endpoint
2. Default new users to "user" role (ID: 2)
3. Assign "admin" role carefully (ID: 1)
4. Check permissions before allowing actions

### Account Lifecycle

1. **Create**: Use `POST /api/users` with strong initial password
2. **Update**: Use `PATCH /api/users/:id` for metadata changes
3. **Password**: Use `POST /api/users/:id/change-password` separately
4. **Deactivate**: Set `isActive: false` instead of deleting
5. **Delete**: Use `DELETE /api/users/:id` only when necessary

### Settings Management

1. Store all settings as strings (convert types in application)
2. Update multiple settings in single request for efficiency
3. Provide sensible defaults for missing settings
4. Validate setting values on client-side before sending

### Self-Service vs Admin Actions

**Users can:**
- View own profile (`GET /api/auth/me`)
- Change own password (`POST /api/users/:id/change-password`)
- Update own settings (`PATCH /api/users/me/settings`)

**Admins can:**
- View all users (`GET /api/users`)
- Create users (`POST /api/users`)
- Update any user (`PATCH /api/users/:id`)
- Delete users (`DELETE /api/users/:id`)
- Change any password (with admin `users.update` permission)
