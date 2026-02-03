# User Management

## Overview

User management provides administrators with tools to create, view, update, and delete user accounts, assign roles, and manage user activation status. The system ensures at least one admin account exists.

## Architecture

**Backend Components:**
- `UserService`: User CRUD operations
- User routes (routes/users.ts): REST API endpoints
- `UserDatabaseService`: Database operations

**Frontend Components:**
- `UsersView`: Main user management page
- `UserTable`: User list with actions
- `UserForm`: Create/edit user dialog
- `ChangePasswordDialog`: Password change form

## Database Schema

**users table:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);
```

**user_settings table:**
```sql
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, setting_key)
);
```

## API Endpoints

#### GET /api/users
Get all users with pagination.
- **Permission:** users.read
- **Query:** `page`, `limit`
- **Response:** Paginated user list with role info

#### GET /api/users/:id
Get single user by ID.
- **Permission:** users.read
- **Response:** User object with permissions list

#### POST /api/users
Create a new user account.
- **Permission:** users.create
- **Body:** `{ "username", "email", "password", "roleId", "isActive" }`
- **Response:** Created user (201)
- **Validation:** Username/email unique, password min 6 chars

#### PATCH /api/users/:id
Update existing user account.
- **Permission:** users.update
- **Body:** Partial update of `{ "email", "roleId", "isActive" }`
- **Response:** Updated user
- **Note:** Cannot change username (immutable)

#### DELETE /api/users/:id
Delete a user account.
- **Permission:** users.delete
- **Rules:** Cannot delete self, cannot delete last admin
- **Cascade:** Deletes tokens, sessions, settings
- **Response:** `{ "success": true }`

#### POST /api/users/:id/change-password
Change user password.
- **Permission:** Own account OR users.update
- **Body:** `{ "currentPassword", "newPassword" }`
- **Response:** `{ "success": true }`
- **Note:** Admins don't need current password

#### PATCH /api/users/me/settings
Update current user's settings.
- **Body:** Key-value pairs for user settings
- **Response:** Updated settings object

## Business Rules

**User Creation:**
1. Username must be unique (case-insensitive)
2. Email must be unique (case-insensitive)
3. Password must meet minimum length requirement
4. Role must exist in system
5. Account is active by default

**User Update:**
1. Cannot change username
2. Email must remain unique if changed
3. Can change role to any valid role
4. Can toggle active status

**User Deletion:**
1. Cannot delete yourself
2. Cannot delete last admin user
3. Cascade deletes tokens, play sessions, user settings
4. Activity logs preserved (user_id set to NULL)

**Password Changes:**
1. Users can change own password (requires current password)
2. Admins can change any password (no current password required)
3. Password hashed with bcrypt before storage

## Permissions

User management operations require:
- `users.read` - View user list and details
- `users.create` - Create new user accounts
- `users.update` - Update user information and roles
- `users.delete` - Delete user accounts

**Default Assignments:**
- **Admin:** All user management permissions
- **User:** None (can only manage own account)
- **Guest:** None

## Common Use Cases

### 1. Create New User
```typescript
const createMutation = useCreateUser();

await createMutation.mutateAsync({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'secure123',
  roleId: 2,
  isActive: true
});
```

### 2. Update User Role
```typescript
const updateMutation = useUpdateUser();

await updateMutation.mutateAsync({
  userId: 10,
  data: { roleId: 3 }
});
```

### 3. Deactivate User
```typescript
const updateMutation = useUpdateUser();

await updateMutation.mutateAsync({
  userId: 10,
  data: { isActive: false }
});
```

### 4. Delete User
```typescript
const deleteMutation = useDeleteUser();

if (confirm(`Delete user ${user.username}?`)) {
  await deleteMutation.mutateAsync(userId);
}
```

### 5. Change Own Password
```typescript
const changePasswordMutation = useChangePassword();

await changePasswordMutation.mutateAsync({
  userId: currentUser.id,
  currentPassword: 'oldpass',
  newPassword: 'newpass'
});
```

## Best Practices

1. Always verify permissions before showing admin UI
2. Confirm destructive actions (delete user)
3. Validate input on both client and server
4. Show loading states during operations
5. Handle errors gracefully with user feedback
6. Log admin actions for audit trail
7. Prevent self-deletion to avoid lockouts
8. Maintain at least one admin in system
9. Deactivate instead of delete when possible
10. Require strong passwords

## Troubleshooting

**Cannot create user:**
- Check username/email uniqueness
- Verify password meets requirements
- Ensure role exists
- Check permissions (users.create)

**Cannot delete user:**
- Verify not deleting self
- Check if last admin user
- Ensure users.delete permission
- Look for foreign key constraints

**Password change fails:**
- Verify current password is correct
- Check new password meets requirements
- Ensure user exists and is active
- Validate permissions

**User list not loading:**
- Check users.read permission
- Verify database connection
- Look for query errors in logs
