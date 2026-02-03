# Role-Based Access Control (RBAC)

## Overview

RBAC provides fine-grained permission management through a flexible role and permission model. Administrators can create custom roles, assign specific permissions, and control user access to features and resources.

## Architecture

**Backend Components:**
- `RoleService`: Role and permission management
- Role routes (routes/roles.ts): REST API endpoints
- RBAC middleware (middleware/rbac.ts): Permission enforcement

**Frontend Components:**
- `RolesView`: Main roles management page
- `RoleTable`: Roles list with actions
- `RoleForm`: Create/edit role dialog
- `ProtectedRoute`: Route guard component
- `useAuth` hook: Permission checking

## Database Schema

**roles table:**
```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**permissions table:**
```sql
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Default Permissions

| Permission | Description | Resource | Action |
|-----------|-------------|----------|--------|
| games.read | View and browse games | games | read |
| games.play | Play games in browser | games | play |
| games.download | Download game files | games | download |
| playlists.read | View playlists | playlists | read |
| playlists.create | Create new playlists | playlists | create |
| playlists.update | Update existing playlists | playlists | update |
| playlists.delete | Delete playlists | playlists | delete |
| users.read | View user accounts | users | read |
| users.create | Create new user accounts | users | create |
| users.update | Update user accounts | users | update |
| users.delete | Delete user accounts | users | delete |
| roles.read | View roles and permissions | roles | read |
| roles.create | Create new roles | roles | create |
| roles.update | Update roles and permissions | roles | update |
| roles.delete | Delete roles | roles | delete |
| settings.read | View system settings | settings | read |
| settings.update | Update system settings | settings | update |
| activities.read | View activity logs | activities | read |

## Default Roles

**Admin (priority: 100):**
- All permissions granted
- Can manage users, roles, and settings

**User (priority: 50):**
- games.read, games.play, games.download
- playlists.read, playlists.create, playlists.update, playlists.delete
- Cannot manage users, roles, settings

**Guest (priority: 0):**
- games.read, playlists.read
- Read-only access only

## API Endpoints

#### GET /api/roles
Get all roles with their permissions.
- **Permission:** roles.read
- **Response:** Array of roles with assigned permissions

#### GET /api/roles/:id
Get single role by ID with permissions.
- **Permission:** roles.read
- **Response:** Role object with full permission list

#### POST /api/roles
Create a new role with permissions.
- **Permission:** roles.create
- **Body:** `{ "name", "description", "priority", "permissionIds" }`
- **Response:** Created role (201)

#### PATCH /api/roles/:id
Update role metadata (name, description, priority).
- **Permission:** roles.update
- **Response:** Updated role

#### PUT /api/roles/:id/permissions
Update role permissions (replaces all).
- **Permission:** roles.update
- **Body:** `{ "permissionIds": [1, 2, 3] }`
- **Response:** Updated role with new permissions

#### DELETE /api/roles/:id
Delete a role.
- **Permission:** roles.delete
- **Rules:** Cannot delete system roles (admin, user, guest) or roles with assigned users

## Frontend Permission Checking

```typescript
// useAuth hook
const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

// Check single permission
if (hasPermission('users.create')) {
  // Show create user UI
}

// Check multiple permissions (OR logic)
if (hasAnyPermission('users.create', 'roles.create')) {
  // Show admin menu
}

// Check multiple permissions (AND logic)
if (hasAllPermissions('users.read', 'users.update')) {
  // Show advanced user management
}
```

## Protected Routes

```tsx
<Route path="/admin/users" element={
  <ProtectedRoute requiredPermissions={['users.read']}>
    <UsersView />
  </ProtectedRoute>
} />
```

## Permission Caching

**Performance Optimization:**
- User permissions cached for 5 minutes
- Role permissions cached for 10 minutes
- Automatic cleanup every 5 minutes
- Cache invalidated when permissions change
- 90%+ reduction in database queries

**Cache Management (Admin):**
- `GET /_cache/permissions/stats` - View cache statistics
- `POST /_cache/permissions/clear` - Manually clear cache

## Best Practices

1. Follow {resource}.{action} naming convention
2. Grant minimum permissions needed (principle of least privilege)
3. Use system roles (admin, user, guest) as foundation
4. Always validate on backend even if UI hides features
5. Show friendly "unauthorized" messages
6. Log role and permission changes for audit trail
7. Test thoroughly to verify permissions work as expected

## Common Pitfalls

1. **Frontend checks only** - Must also validate on backend
2. **Missing middleware** - Ensure requirePermission() applied to routes
3. **Incorrect permission names** - Must match exactly
4. **Stale cached permissions** - Clear cache after changes
5. **Not checking user active status** - Deactivated users should be blocked

## Troubleshooting

**Permission denied errors:**
- Verify user has correct role
- Check role has required permission
- Validate role-permission mapping exists
- Check if user is active

**UI shows unauthorized content:**
- Frontend permission check may be incorrect
- Check if user permissions loaded
- Verify hasPermission() logic
- Inspect auth state in DevTools

**Backend allows unauthorized access:**
- Ensure requirePermission() middleware applied
- Check middleware order (auth before RBAC)
- Verify permission names match exactly
- Look for missing middleware on routes
