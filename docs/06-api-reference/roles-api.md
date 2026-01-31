# Roles & Permissions API

Endpoints for managing role-based access control (RBAC) including roles and permissions.

## List Roles

Get all roles with their permissions.

**Endpoint:** `GET /api/roles`

**Authentication:** Required

**Permissions:** `roles.read`

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "admin",
    "description": "System administrator with full access",
    "priority": 100,
    "isSystem": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "permissions": [
      {
        "id": 1,
        "name": "games.play",
        "description": "Play games in browser",
        "category": "games"
      },
      {
        "id": 2,
        "name": "games.read",
        "description": "View game details",
        "category": "games"
      },
      {
        "id": 10,
        "name": "users.create",
        "description": "Create new users",
        "category": "users"
      }
    ]
  },
  {
    "id": 2,
    "name": "user",
    "description": "Standard user with basic permissions",
    "priority": 10,
    "isSystem": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "permissions": [
      {
        "id": 1,
        "name": "games.play",
        "description": "Play games in browser",
        "category": "games"
      },
      {
        "id": 2,
        "name": "games.read",
        "description": "View game details",
        "category": "games"
      },
      {
        "id": 5,
        "name": "playlists.create",
        "description": "Create playlists",
        "category": "playlists"
      }
    ]
  }
]
```

**Examples:**

```bash
curl http://localhost:3100/api/roles \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: roles } = await axios.get(
  'http://localhost:3100/api/roles',
  { headers: { Authorization: `Bearer ${token}` } }
);

// Use in role selector
const roleOptions = roles.map(role => ({
  label: `${role.name} - ${role.description}`,
  value: role.id
}));
```

---

## List Permissions

Get all available permissions in the system.

**Endpoint:** `GET /api/roles/permissions`

**Authentication:** Required

**Permissions:** `roles.read`

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "games.play",
    "description": "Play games in browser",
    "category": "games"
  },
  {
    "id": 2,
    "name": "games.read",
    "description": "View game details",
    "category": "games"
  },
  {
    "id": 3,
    "name": "games.download",
    "description": "Download game files",
    "category": "games"
  },
  {
    "id": 5,
    "name": "playlists.create",
    "description": "Create playlists",
    "category": "playlists"
  },
  {
    "id": 6,
    "name": "playlists.update",
    "description": "Update own playlists",
    "category": "playlists"
  },
  {
    "id": 7,
    "name": "playlists.delete",
    "description": "Delete own playlists",
    "category": "playlists"
  },
  {
    "id": 10,
    "name": "users.read",
    "description": "View user list",
    "category": "users"
  },
  {
    "id": 11,
    "name": "users.create",
    "description": "Create new users",
    "category": "users"
  },
  {
    "id": 12,
    "name": "users.update",
    "description": "Update user information",
    "category": "users"
  },
  {
    "id": 13,
    "name": "users.delete",
    "description": "Delete users",
    "category": "users"
  },
  {
    "id": 20,
    "name": "roles.read",
    "description": "View roles and permissions",
    "category": "roles"
  },
  {
    "id": 21,
    "name": "roles.create",
    "description": "Create new roles",
    "category": "roles"
  },
  {
    "id": 22,
    "name": "roles.update",
    "description": "Update roles",
    "category": "roles"
  },
  {
    "id": 23,
    "name": "roles.delete",
    "description": "Delete roles",
    "category": "roles"
  }
]
```

**Examples:**

```bash
curl http://localhost:3100/api/roles/permissions \
  -H "Authorization: Bearer <token>"
```

```javascript
const { data: permissions } = await axios.get(
  'http://localhost:3100/api/roles/permissions',
  { headers: { Authorization: `Bearer ${token}` } }
);

// Group by category
const grouped = permissions.reduce((acc, perm) => {
  if (!acc[perm.category]) acc[perm.category] = [];
  acc[perm.category].push(perm);
  return acc;
}, {});
```

---

## Get Role

Get detailed information about a specific role.

**Endpoint:** `GET /api/roles/:id`

**Authentication:** Required

**Permissions:** `roles.read`

**URL Parameters:**

- `id` (integer, required) - Role ID

**Response:** `200 OK`

```json
{
  "id": 2,
  "name": "user",
  "description": "Standard user with basic permissions",
  "priority": 10,
  "isSystem": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "permissions": [
    {
      "id": 1,
      "name": "games.play",
      "description": "Play games in browser",
      "category": "games"
    },
    {
      "id": 2,
      "name": "games.read",
      "description": "View game details",
      "category": "games"
    },
    {
      "id": 5,
      "name": "playlists.create",
      "description": "Create playlists",
      "category": "playlists"
    },
    {
      "id": 6,
      "name": "playlists.update",
      "description": "Update own playlists",
      "category": "playlists"
    },
    {
      "id": 7,
      "name": "playlists.delete",
      "description": "Delete own playlists",
      "category": "playlists"
    }
  ]
}
```

**Error Responses:**

- `404 Not Found` - Role not found

**Examples:**

```bash
curl http://localhost:3100/api/roles/2 \
  -H "Authorization: Bearer <token>"
```

```javascript
const roleId = 2;
const { data: role } = await axios.get(
  `http://localhost:3100/api/roles/${roleId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Create Role

Create a new custom role with permissions.

**Endpoint:** `POST /api/roles`

**Authentication:** Required

**Permissions:** `roles.create`

**Request Body:**

```json
{
  "name": "string (min: 3, max: 50)",
  "description": "string (optional)",
  "priority": "integer (default: 0)",
  "permissionIds": "array of integers (optional)"
}
```

**Response:** `201 Created`

```json
{
  "id": 5,
  "name": "moderator",
  "description": "Moderator with limited admin permissions",
  "priority": 50,
  "isSystem": false,
  "createdAt": "2024-03-21T10:00:00Z",
  "permissions": [
    {
      "id": 1,
      "name": "games.play",
      "description": "Play games in browser",
      "category": "games"
    },
    {
      "id": 2,
      "name": "games.read",
      "description": "View game details",
      "category": "games"
    },
    {
      "id": 10,
      "name": "users.read",
      "description": "View user list",
      "category": "users"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `409 Conflict` - Role name already exists

**Examples:**

```bash
curl -X POST http://localhost:3100/api/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "moderator",
    "description": "Moderator with limited admin permissions",
    "priority": 50,
    "permissionIds": [1, 2, 10]
  }'
```

```javascript
const newRole = await axios.post(
  'http://localhost:3100/api/roles',
  {
    name: 'moderator',
    description: 'Moderator with limited admin permissions',
    priority: 50,
    permissionIds: [1, 2, 10, 11]
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Update Role

Update role metadata (name, description, priority). Use separate endpoint to update permissions.

**Endpoint:** `PATCH /api/roles/:id`

**Authentication:** Required

**Permissions:** `roles.update`

**URL Parameters:**

- `id` (integer, required) - Role ID

**Request Body:**

All fields are optional:

```json
{
  "name": "string (min: 3, max: 50, optional)",
  "description": "string (optional)",
  "priority": "integer (optional)"
}
```

**Response:** `200 OK`

```json
{
  "id": 5,
  "name": "senior_moderator",
  "description": "Senior moderator with extended permissions",
  "priority": 75,
  "isSystem": false,
  "createdAt": "2024-03-21T10:00:00Z",
  "permissions": [...]
}
```

**Error Responses:**

- `400 Bad Request` - Validation error or cannot modify system role
- `404 Not Found` - Role not found
- `409 Conflict` - Role name already exists

**Examples:**

```bash
curl -X PATCH http://localhost:3100/api/roles/5 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "senior_moderator",
    "priority": 75
  }'
```

```javascript
const roleId = 5;
const { data: updatedRole } = await axios.patch(
  `http://localhost:3100/api/roles/${roleId}`,
  {
    name: 'senior_moderator',
    description: 'Senior moderator with extended permissions',
    priority: 75
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Update Role Permissions

Replace all permissions for a role.

**Endpoint:** `PUT /api/roles/:id/permissions`

**Authentication:** Required

**Permissions:** `roles.update`

**URL Parameters:**

- `id` (integer, required) - Role ID

**Request Body:**

```json
{
  "permissionIds": [1, 2, 5, 6, 7, 10, 11]
}
```

**Response:** `200 OK`

```json
{
  "id": 5,
  "name": "moderator",
  "description": "Moderator with limited admin permissions",
  "priority": 50,
  "isSystem": false,
  "createdAt": "2024-03-21T10:00:00Z",
  "permissions": [
    {
      "id": 1,
      "name": "games.play",
      "description": "Play games in browser",
      "category": "games"
    },
    {
      "id": 2,
      "name": "games.read",
      "description": "View game details",
      "category": "games"
    },
    {
      "id": 10,
      "name": "users.read",
      "description": "View user list",
      "category": "users"
    },
    {
      "id": 11,
      "name": "users.create",
      "description": "Create new users",
      "category": "users"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Validation error or cannot modify system role
- `404 Not Found` - Role not found

**Examples:**

```bash
curl -X PUT http://localhost:3100/api/roles/5/permissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionIds": [1, 2, 5, 6, 7, 10, 11]
  }'
```

```javascript
const roleId = 5;
const permissionIds = [1, 2, 5, 6, 7, 10, 11];

const { data: updatedRole } = await axios.put(
  `http://localhost:3100/api/roles/${roleId}/permissions`,
  { permissionIds },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Delete Role

Delete a custom role. Cannot delete system roles (admin, user, moderator, guest).

**Endpoint:** `DELETE /api/roles/:id`

**Authentication:** Required

**Permissions:** `roles.delete`

**URL Parameters:**

- `id` (integer, required) - Role ID

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Cannot delete system role
- `404 Not Found` - Role not found

**Examples:**

```bash
curl -X DELETE http://localhost:3100/api/roles/5 \
  -H "Authorization: Bearer <token>"
```

```javascript
const roleId = 5;
await axios.delete(
  `http://localhost:3100/api/roles/${roleId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## System Roles

The following roles are built-in and cannot be deleted or have their core permissions modified:

### Admin (ID: 1)

**Priority:** 100

**Description:** System administrator with full access to all features.

**Key Permissions:**
- All game permissions
- All playlist permissions
- All user management permissions
- All role management permissions
- System configuration access

### User (ID: 2)

**Priority:** 10

**Description:** Standard user with basic access.

**Key Permissions:**
- `games.play` - Play games
- `games.read` - View game details
- `playlists.create` - Create playlists
- `playlists.update` - Update own playlists
- `playlists.delete` - Delete own playlists

### Moderator (ID: 3)

**Priority:** 50

**Description:** Moderator with limited admin capabilities.

**Key Permissions:**
- All user permissions
- `users.read` - View user list
- Limited content moderation capabilities

### Guest (ID: 4)

**Priority:** 1

**Description:** Guest user with read-only access.

**Key Permissions:**
- `games.read` - View game details
- No play or modification permissions

---

## Permission Categories

Permissions are organized into categories:

### Games (`games`)
- `games.play` - Play games in browser
- `games.read` - View game details
- `games.download` - Download game files
- `games.manage` - Manage game metadata (future)

### Playlists (`playlists`)
- `playlists.create` - Create new playlists
- `playlists.update` - Update own playlists
- `playlists.delete` - Delete own playlists
- `playlists.manage` - Manage all playlists (admin)

### Users (`users`)
- `users.read` - View user list
- `users.create` - Create new users
- `users.update` - Update user information
- `users.delete` - Delete users

### Roles (`roles`)
- `roles.read` - View roles and permissions
- `roles.create` - Create new roles
- `roles.update` - Update roles
- `roles.delete` - Delete roles

### System (`system`)
- `system.settings` - Manage system settings
- `system.maintenance` - Perform maintenance tasks
- `system.logs` - View system logs

---

## RBAC Best Practices

### Role Design

1. **Principle of Least Privilege**: Grant only necessary permissions
2. **Separation of Duties**: Create distinct roles for different responsibilities
3. **Role Hierarchy**: Use priority field to establish role hierarchy
4. **System Roles**: Never delete or drastically modify system roles

### Permission Management

1. **Granular Permissions**: Use specific permissions (e.g., `users.create` vs broad `users.manage`)
2. **Category Organization**: Keep permissions organized by category
3. **Documentation**: Maintain clear permission descriptions
4. **Regular Audits**: Periodically review role permissions

### Implementation

```javascript
// Check if user has specific permission
function hasPermission(user, permission) {
  return user.permissions.includes(permission);
}

// Frontend route protection
if (!hasPermission(user, 'users.read')) {
  // Redirect or show error
}

// Backend middleware (automatic via requirePermission)
router.get('/users',
  authenticate,
  requirePermission('users.read'),
  getUsersHandler
);
```

### Custom Role Example

Creating a "Content Manager" role:

```javascript
// 1. Get available permissions
const { data: permissions } = await axios.get('/api/roles/permissions');

// 2. Select relevant permissions
const contentManagerPerms = permissions
  .filter(p =>
    p.category === 'games' ||
    (p.category === 'playlists' && p.name !== 'playlists.delete')
  )
  .map(p => p.id);

// 3. Create role
await axios.post('/api/roles', {
  name: 'content_manager',
  description: 'Manages game content and playlists',
  priority: 40,
  permissionIds: contentManagerPerms
});
```

### Migration Guide

When adding new permissions:

1. Add permission to database via migration
2. Update permission list in RoleService
3. Assign to relevant system roles
4. Document permission in API docs
5. Update frontend permission checks
