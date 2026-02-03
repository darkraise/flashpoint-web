# Users API

Manage user accounts and settings.

## List Users

`GET /api/users` - Requires `users.read` permission

Query params: `page` (default: 1), `limit` (default: 50)

Returns paginated array with id, username, email, roleId, roleName, isActive, createdAt, lastLoginAt.

## Get User

`GET /api/users/:id` - Requires `users.read` permission

Returns user object plus permissions array.

Error: `404 Not Found`

## Create User

`POST /api/users` - Requires `users.create` permission

Body: `{ "username": "string (3-50)", "email": "valid-email", "password": "string (min 6)", "roleId": integer, "isActive": boolean (optional) }`

Returns `201 Created` with new user.

Error: `409 Conflict` if username/email exists

## Update User

`PATCH /api/users/:id` - Requires `users.update` permission

Body (all optional): `{ "email": "valid-email", "roleId": integer, "isActive": boolean }`

Error: `409 Conflict` if new email already exists

## Delete User

`DELETE /api/users/:id` - Requires `users.delete` permission

Cannot delete last admin user.

Error: `400 Bad Request` if last admin

## Change Password

`POST /api/users/:id/change-password` - Users can change own, admins can change any (requires `users.update`)

Body: `{ "currentPassword": "string", "newPassword": "string (min 6)" }`

Error: `401 Unauthorized` if current password incorrect

## Get User Settings

`GET /api/users/me/settings` - Requires authentication

Returns key-value pairs (stored as strings). Common keys:
- theme_mode (light|dark|system)
- primary_color (blue|green|red|purple|orange|pink)
- game_view_mode (grid|list)
- games_per_page (string, numeric)
- auto_play_next (true|false)
- show_extreme_content (true|false)

## Update User Settings

`PATCH /api/users/me/settings` - Requires authentication

Body: `{ "theme_mode": "dark", "primary_color": "blue", ... }`

All fields optional. Values stored as strings.

## Best Practices

- Store values as strings in settings (convert on client)
- Update multiple settings in one request
- Provide sensible defaults for missing settings
- Validate settings on client before sending
- Users can only view/modify own settings (except admins)
- Default new users to "user" role (ID: 2)
- Assign "admin" role carefully (ID: 1)
- Use `isActive: false` to deactivate instead of deleting
- Enforce strong password requirements in production
