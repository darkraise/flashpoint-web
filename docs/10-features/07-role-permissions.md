# Role-Based Access Control (RBAC)

## Overview

The Role-Based Access Control (RBAC) system provides fine-grained permission management through a flexible role and permission model. Administrators can create custom roles, assign specific permissions, and control user access to features and resources throughout the application. The system uses a many-to-many relationship between roles and permissions, allowing for complex access control scenarios.

## User-Facing Functionality

### View Roles
- **Roles List:**
  - All system roles displayed
  - Role name, description, priority
  - Permission count per role
  - System roles marked (cannot delete)
  - Sort by priority or name

### View Role Details
- **Role Information:**
  - Role metadata (name, description, priority)
  - Complete list of assigned permissions
  - Grouped by resource (games, users, playlists, etc.)
  - User count with this role
  - Creation and modification timestamps

### Create Role
- **Role Creation Form:**
  - Role name (3-50 characters, unique)
  - Description (optional)
  - Priority (numeric, for hierarchy)
  - Permission selection (multi-select checkboxes)
  - Grouped permission picker
  - Save/cancel actions

### Update Role
- **Role Editing:**
  - Update name, description, priority
  - Add/remove permissions
  - Cannot edit system roles (admin, user, guest)
  - Changes affect all users with role
  - Confirmation for permission changes

### Delete Role
- **Role Deletion:**
  - Confirmation required
  - Cannot delete system roles (admin, user, guest)
  - Cannot delete role if users assigned
  - Must reassign users first
  - Cascade deletes role-permission mappings

### Permission Browser
- **View All Permissions:**
  - Grouped by resource (games, users, roles, etc.)
  - Permission name, description, action
  - Which roles have each permission
  - Read-only view

### Permission Checking
- **Frontend Guards:**
  - ProtectedRoute component
  - hasPermission() hook
  - Permission-based UI hiding
  - Redirect to unauthorized page

- **Backend Enforcement:**
  - requirePermission() middleware
  - Per-endpoint permission checks
  - User permissions loaded from role
  - 403 Forbidden on insufficient permissions

## Technical Implementation

### Architecture

**Backend Components:**
- `RoleService`: Role and permission management
- Role routes (routes/roles.ts): REST API endpoints
- `UserDatabaseService`: Database operations
- RBAC middleware (middleware/rbac.ts): Permission enforcement
- Auth middleware: Permission loading

**Frontend Components:**
- `RolesView`: Main roles management page
- `RoleTable`: Roles list with actions
- `RoleForm`: Create/edit role dialog
- `PermissionSelector`: Permission picker
- `ProtectedRoute`: Route guard component
- `useRoles` hook: Role operations
- `useAuth` hook: Permission checking

### Database Schema

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

-- Default roles
INSERT INTO roles (id, name, description, priority) VALUES
  (1, 'admin', 'Administrator with full access to all features', 100),
  (2, 'user', 'Regular user with standard access', 50),
  (3, 'guest', 'Guest user with read-only access', 0);
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

CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Default permissions (18 total)
INSERT INTO permissions (name, description, resource, action) VALUES
  -- Games
  ('games.read', 'View and browse games', 'games', 'read'),
  ('games.play', 'Play games in browser', 'games', 'play'),
  ('games.download', 'Download game files', 'games', 'download'),

  -- Playlists
  ('playlists.read', 'View playlists', 'playlists', 'read'),
  ('playlists.create', 'Create new playlists', 'playlists', 'create'),
  ('playlists.update', 'Update existing playlists', 'playlists', 'update'),
  ('playlists.delete', 'Delete playlists', 'playlists', 'delete'),

  -- Users
  ('users.read', 'View user accounts', 'users', 'read'),
  ('users.create', 'Create new user accounts', 'users', 'create'),
  ('users.update', 'Update user accounts', 'users', 'update'),
  ('users.delete', 'Delete user accounts', 'users', 'delete'),

  -- Roles
  ('roles.read', 'View roles and permissions', 'roles', 'read'),
  ('roles.create', 'Create new roles', 'roles', 'create'),
  ('roles.update', 'Update roles and permissions', 'roles', 'update'),
  ('roles.delete', 'Delete roles', 'roles', 'delete'),

  -- Settings
  ('settings.read', 'View system settings', 'settings', 'read'),
  ('settings.update', 'Update system settings', 'settings', 'update'),

  -- Activities
  ('activities.read', 'View activity logs', 'activities', 'read');
```

**role_permissions table (many-to-many):**
```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Default permission assignments
-- Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- User: All except user/role/settings/activities management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE resource NOT IN ('users', 'roles', 'settings', 'activities');

-- Guest: Read-only for games and playlists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE action = 'read' AND resource IN ('games', 'playlists');
```

### API Endpoints

#### GET /api/roles
Get all roles with their permissions.

**Authentication:** Required
**Permission:** roles.read

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "admin",
    "description": "Administrator with full access to all features",
    "priority": 100,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "permissions": [
      {
        "id": 1,
        "name": "games.read",
        "description": "View and browse games",
        "resource": "games",
        "action": "read"
      }
      // ... all 18 permissions
    ]
  },
  {
    "id": 2,
    "name": "user",
    "description": "Regular user with standard access",
    "priority": 50,
    "permissions": [
      // ... user permissions (games, playlists)
    ]
  },
  {
    "id": 3,
    "name": "guest",
    "description": "Guest user with read-only access",
    "priority": 0,
    "permissions": [
      // ... read-only permissions
    ]
  }
]
```

**Errors:**
- 401: Not authenticated
- 403: Missing roles.read permission

#### GET /api/roles/permissions
Get all available permissions.

**Authentication:** Required
**Permission:** roles.read

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "games.read",
    "description": "View and browse games",
    "resource": "games",
    "action": "read",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "games.play",
    "description": "Play games in browser",
    "resource": "games",
    "action": "play",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
  // ... all permissions
]
```

**Errors:**
- 401: Not authenticated
- 403: Missing roles.read permission

#### GET /api/roles/:id
Get single role by ID with permissions.

**Authentication:** Required
**Permission:** roles.read

**Response (200 OK):**
```json
{
  "id": 2,
  "name": "user",
  "description": "Regular user with standard access",
  "priority": 50,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "permissions": [
    {
      "id": 1,
      "name": "games.read",
      "description": "View and browse games",
      "resource": "games",
      "action": "read"
    },
    {
      "id": 2,
      "name": "games.play",
      "description": "Play games in browser",
      "resource": "games",
      "action": "play"
    }
    // ... other user permissions
  ]
}
```

**Errors:**
- 401: Not authenticated
- 403: Missing roles.read permission
- 404: Role not found

#### POST /api/roles
Create a new role with permissions.

**Authentication:** Required
**Permission:** roles.create

**Request Body:**
```json
{
  "name": "moderator",
  "description": "Moderator with limited admin access",
  "priority": 75,
  "permissionIds": [1, 2, 3, 4, 5, 6, 7]
}
```

**Response (201 Created):**
```json
{
  "id": 4,
  "name": "moderator",
  "description": "Moderator with limited admin access",
  "priority": 75,
  "createdAt": "2024-03-21T10:00:00.000Z",
  "updatedAt": "2024-03-21T10:00:00.000Z",
  "permissions": [
    // ... assigned permissions
  ]
}
```

**Validation Rules:**
- Name: 3-50 characters, unique, alphanumeric + spaces
- Description: Optional, max 500 characters
- Priority: Integer, default 0
- PermissionIds: Array of valid permission IDs

**Errors:**
- 400: Validation error
- 401: Not authenticated
- 403: Missing roles.create permission
- 409: Role name already exists

#### PATCH /api/roles/:id
Update role metadata (name, description, priority).

**Authentication:** Required
**Permission:** roles.update

**Request Body (partial updates):**
```json
{
  "name": "moderator-updated",
  "description": "Updated description",
  "priority": 80
}
```

**Response (200 OK):**
```json
{
  "id": 4,
  "name": "moderator-updated",
  "description": "Updated description",
  "priority": 80,
  "createdAt": "2024-03-21T10:00:00.000Z",
  "updatedAt": "2024-03-21T11:00:00.000Z",
  "permissions": [
    // ... existing permissions
  ]
}
```

**Business Rules:**
- Cannot update system roles (id 1, 2, 3)
- Name must remain unique if changed
- Priority can be any integer

**Errors:**
- 400: Cannot update system role or validation error
- 401: Not authenticated
- 403: Missing roles.update permission
- 404: Role not found
- 409: Role name already exists

#### PUT /api/roles/:id/permissions
Update role permissions (replaces all permissions).

**Authentication:** Required
**Permission:** roles.update

**Request Body:**
```json
{
  "permissionIds": [1, 2, 3, 8, 9, 10]
}
```

**Response (200 OK):**
```json
{
  "id": 4,
  "name": "moderator",
  "description": "Moderator with limited admin access",
  "priority": 75,
  "permissions": [
    // ... new set of permissions
  ]
}
```

**Implementation:**
1. Delete all existing role-permission mappings for role
2. Insert new mappings for provided permission IDs
3. Return updated role with new permissions

**Errors:**
- 400: Cannot update system role permissions or invalid permission IDs
- 401: Not authenticated
- 403: Missing roles.update permission
- 404: Role not found

#### DELETE /api/roles/:id
Delete a role.

**Authentication:** Required
**Permission:** roles.delete

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Business Rules:**
- Cannot delete system roles (id 1, 2, 3)
- Cannot delete role with assigned users
- Must reassign users to different role first
- Cascade deletes role-permission mappings

**Errors:**
- 400: Cannot delete system role or role has users
- 401: Not authenticated
- 403: Missing roles.delete permission
- 404: Role not found

### Permission Caching

**Performance Optimization** (Added in v1.2.0):

To improve performance and reduce database load, user and role permissions are cached in memory.

**Cache Details:**
- **Service:** `PermissionCache` (singleton)
- **User Permissions TTL:** 5 minutes
- **Role Permissions TTL:** 10 minutes
- **Automatic Cleanup:** Every 5 minutes
- **Performance Gain:** 90%+ reduction in database queries

**Cache Flow:**
```typescript
1. Permission check requested
2. Check PermissionCache for user permissions
3. If found: return cached permissions (1-5ms)
4. If not found: query database, cache result (50-100ms)
5. Cache automatically expires after TTL
6. Cache invalidated when permissions change
```

**Automatic Invalidation:**
- User role changes → User cache cleared
- Role permissions updated → Role cache cleared
- Manual cache clear → Admin endpoint

**Cache Management:**

Administrators can view and manage the permission cache:

```bash
# View cache statistics
GET /_cache/permissions/stats

# Clear all caches
POST /_cache/permissions/clear
Body: { "type": "all" }

# Clear specific user
POST /_cache/permissions/clear
Body: { "type": "user", "id": 5 }

# Clear specific role
POST /_cache/permissions/clear
Body: { "type": "role", "id": 2 }
```

**Important Notes:**
- Permission changes may take up to 5 minutes to propagate
- For immediate revocation, manually clear the cache
- Cache statistics available for monitoring

See [PermissionCache Service](../../03-backend/services/permission-cache-service.md) for detailed documentation.

### Permission Enforcement

**Backend Middleware:**

```typescript
// middleware/rbac.ts
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const userPermissions = req.user.permissions || [];

    // User must have at least one of the required permissions
    const hasPermission = permissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return next(new AppError(403, 'Insufficient permissions'));
    }

    next();
  };
};
```

**Usage in Routes:**

```typescript
// Require single permission
router.get('/users',
  authenticate,
  requirePermission('users.read'),
  async (req, res) => { /* ... */ }
);

// Require one of multiple permissions
router.post('/games/:id/play',
  authenticate,
  requirePermission('games.play', 'admin'),
  async (req, res) => { /* ... */ }
);
```

**Frontend Permission Checking:**

```typescript
// useAuth hook
export function useAuth() {
  const user = useAuthStore(state => state.user);

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (...permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
```

**Protected Routes:**

```typescript
// ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requireAll?: boolean;  // Require all permissions (AND) vs any (OR)
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false
}: ProtectedRouteProps) {
  const { user, hasPermission, hasAllPermissions, hasAnyPermission } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(...requiredPermissions)
      : hasAnyPermission(...requiredPermissions);

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
```

**Conditional UI Rendering:**

```typescript
// In components
const { hasPermission } = useAuth();

return (
  <div>
    {hasPermission('users.create') && (
      <Button onClick={handleCreateUser}>
        Create User
      </Button>
    )}

    {hasPermission('users.delete') && (
      <Button onClick={handleDeleteUser} variant="destructive">
        Delete User
      </Button>
    )}
  </div>
);
```

## UI Components

### RolesView
**Location:** `frontend/src/views/RolesView.tsx`

**Features:**
- Roles list table
- Create role button
- Edit/delete actions
- Permission count display
- System role badges

### RoleTable
**Location:** `frontend/src/components/roles/RoleTable.tsx`

**Features:**
- Sortable columns
- Priority display
- Permission count
- Action buttons
- System role protection

### RoleForm
**Location:** `frontend/src/components/roles/RoleForm.tsx`

**Props:**
```typescript
interface RoleFormProps {
  role?: Role;           // For edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features:**
- Create/edit modes
- Name and description inputs
- Priority number input
- Permission selector integration
- Form validation
- Loading states

### PermissionSelector
**Location:** `frontend/src/components/roles/PermissionSelector.tsx`

**Features:**
- Grouped permission checkboxes
- Resource-based grouping (games, users, playlists, etc.)
- Select all per group
- Permission descriptions
- Visual indication of selected permissions

## Common Use Cases

### 1. Create Custom Role
```typescript
const createMutation = useCreateRole();

await createMutation.mutateAsync({
  name: 'moderator',
  description: 'Content moderator',
  priority: 75,
  permissionIds: [1, 2, 3, 4, 5, 6, 7, 8]
});

// Role created with selected permissions
```

### 2. Update Role Permissions
```typescript
const updatePermissionsMutation = useUpdateRolePermissions();

await updatePermissionsMutation.mutateAsync({
  roleId: 4,
  permissionIds: [1, 2, 3, 8, 9, 10, 11]
});

// Role permissions updated
// All users with this role now have new permissions
```

### 3. Check Permission in Component
```typescript
const { hasPermission } = useAuth();

if (hasPermission('users.create')) {
  // Show create user UI
}

if (hasPermission('roles.update')) {
  // Show edit role button
}
```

### 4. Protect Route
```tsx
<Route path="/admin/users" element={
  <ProtectedRoute requiredPermissions={['users.read']}>
    <UsersView />
  </ProtectedRoute>
} />

<Route path="/admin/roles" element={
  <ProtectedRoute requiredPermissions={['roles.read']}>
    <RolesView />
  </ProtectedRoute>
} />
```

### 5. Backend Permission Check
```typescript
// In route handler
router.post('/users',
  authenticate,
  requirePermission('users.create'),
  async (req, res) => {
    // Only users with users.create permission reach here
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  }
);
```

### 6. Multi-Permission Check
```typescript
const { hasAllPermissions, hasAnyPermission } = useAuth();

// Require ALL permissions (AND logic)
if (hasAllPermissions('users.read', 'users.update')) {
  // Show advanced user management
}

// Require ANY permission (OR logic)
if (hasAnyPermission('users.create', 'roles.create')) {
  // Show admin menu
}
```

## Permission Hierarchy

**Resource Categories:**
1. **Games:** games.read, games.play, games.download
2. **Playlists:** playlists.read, playlists.create, playlists.update, playlists.delete
3. **Users:** users.read, users.create, users.update, users.delete
4. **Roles:** roles.read, roles.create, roles.update, roles.delete
5. **Settings:** settings.read, settings.update
6. **Activities:** activities.read

**Action Types:**
- **read:** View/browse resources
- **create:** Create new resources
- **update:** Modify existing resources
- **delete:** Remove resources
- **play:** Execute/run resources (games)
- **download:** Download files

## Best Practices

1. **Principle of Least Privilege:** Grant minimum permissions needed
2. **Role Hierarchy:** Use priority for role precedence
3. **Default Roles:** Maintain admin, user, guest as system roles
4. **Permission Naming:** Follow {resource}.{action} convention
5. **Frontend Checks:** Always validate on backend too
6. **UI Hiding:** Hide features user can't access
7. **Graceful Errors:** Show friendly "unauthorized" messages
8. **Audit Changes:** Log role and permission modifications
9. **Test Thoroughly:** Verify permissions work as expected
10. **Document Permissions:** Clear descriptions for each permission

## Troubleshooting

### Permission denied errors
- Verify user has correct role
- Check role has required permission
- Ensure role-permission mapping exists
- Validate JWT contains current permissions

### Cannot update permissions
- Check if system role (cannot modify)
- Verify roles.update permission
- Ensure permission IDs are valid
- Look for database constraints

### UI shows unauthorized content
- Frontend permission check may be incorrect
- Check if user permissions loaded
- Verify hasPermission() logic
- Inspect auth state in DevTools

### Backend allows unauthorized access
- Ensure requirePermission() middleware applied
- Check middleware order (auth before RBAC)
- Verify permission names match exactly
- Look for missing middleware on routes

## Future Enhancements

- Resource-level permissions (per-game, per-playlist)
- Temporary permission grants (time-limited)
- Permission inheritance (hierarchical roles)
- Dynamic permissions (computed at runtime)
- Permission groups (bundle related permissions)
- Conditional permissions (context-aware)
- Permission delegation (users grant to others)
- Permission audit history
- Visual permission matrix editor
- Role templates for common scenarios
- Permission usage analytics
- Role simulation/testing tool
