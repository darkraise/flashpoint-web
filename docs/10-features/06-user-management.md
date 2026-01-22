# User Management

## Overview

The user management feature provides administrators with comprehensive tools to manage user accounts, roles, and access control. Administrators can create, view, update, and delete user accounts, assign roles, change passwords, and manage user activation status. The system ensures at least one admin account exists and prevents deletion of the last administrator.

## User-Facing Functionality

### View Users
- **User List Table:**
  - Username, email, role, status columns
  - Active/inactive badge indicators
  - Creation and last login timestamps
  - Pagination support
  - Sort by any column
  - Search/filter users (future)

### Create User
- **User Creation Form:**
  - Username (3-50 characters, unique)
  - Email (valid format, unique)
  - Password (minimum 6 characters)
  - Role assignment dropdown
  - Active status toggle
  - Form validation with error messages

### Update User
- **User Edit Dialog:**
  - Update email address
  - Change role assignment
  - Toggle active/inactive status
  - Cannot edit username (immutable)
  - Save/cancel actions

### Delete User
- **User Deletion:**
  - Confirmation dialog required
  - Cannot delete self
  - Cannot delete last admin
  - Cascade deletes related data:
    - Refresh tokens
    - Play sessions
    - Activity logs (set user_id to NULL)
    - User settings

### Change Password
- **Password Management:**
  - Users can change own password
  - Requires current password verification
  - Admins can change any user password
  - Password strength validation
  - Success confirmation

### User Details
- **View User Profile:**
  - User information display
  - Role and permissions list
  - Activity history
  - Play statistics
  - Last login timestamp
  - Account creation date

## Technical Implementation

### Architecture

**Backend Components:**
- `UserService`: User CRUD operations
- `AuthService`: Password management
- User routes (routes/users.ts): REST API endpoints
- `UserDatabaseService`: Database operations
- RBAC middleware: Permission checking

**Frontend Components:**
- `UsersView`: Main user management page
- `UserTable`: User list with actions
- `UserForm`: Create/edit user dialog
- `ChangePasswordDialog`: Password change form
- `useUsers` hook: User operations

### Database Schema

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

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
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

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX idx_user_settings_user_key ON user_settings(user_id, setting_key);
```

### API Endpoints

#### GET /api/users
Get all users with pagination.

**Authentication:** Required
**Permission:** users.read

**Query Parameters:**
```typescript
{
  page?: number;    // Default: 1
  limit?: number;   // Default: 50
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "roleName": "admin",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-03-20T15:30:00.000Z",
      "lastLoginAt": "2024-03-20T15:30:00.000Z"
    }
    // ... more users
  ],
  "total": 15,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

**Errors:**
- 401: Not authenticated
- 403: Missing users.read permission

#### GET /api/users/:id
Get single user by ID.

**Authentication:** Required
**Permission:** users.read

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "roleName": "admin",
  "roleId": 1,
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-03-20T15:30:00.000Z",
  "lastLoginAt": "2024-03-20T15:30:00.000Z",
  "permissions": [
    "games.read",
    "users.create",
    // ... all permissions
  ]
}
```

**Errors:**
- 401: Not authenticated
- 403: Missing users.read permission
- 404: User not found

#### POST /api/users
Create a new user account.

**Authentication:** Required
**Permission:** users.create

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "secure123",
  "roleId": 2,
  "isActive": true
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "username": "newuser",
  "email": "newuser@example.com",
  "roleName": "user",
  "roleId": 2,
  "isActive": true,
  "createdAt": "2024-03-21T09:00:00.000Z",
  "updatedAt": "2024-03-21T09:00:00.000Z",
  "lastLoginAt": null
}
```

**Validation Rules:**
- Username: 3-50 characters, alphanumeric + underscore, unique
- Email: Valid email format, unique
- Password: Minimum 6 characters
- RoleId: Must exist in roles table
- IsActive: Boolean (optional, default true)

**Errors:**
- 400: Validation error (invalid input)
- 401: Not authenticated
- 403: Missing users.create permission
- 409: Username or email already exists

#### PATCH /api/users/:id
Update existing user account.

**Authentication:** Required
**Permission:** users.update

**Request Body (partial updates):**
```json
{
  "email": "updated@example.com",
  "roleId": 3,
  "isActive": false
}
```

**Response (200 OK):**
```json
{
  "id": 10,
  "username": "newuser",
  "email": "updated@example.com",
  "roleName": "guest",
  "roleId": 3,
  "isActive": false,
  "createdAt": "2024-03-21T09:00:00.000Z",
  "updatedAt": "2024-03-21T10:30:00.000Z",
  "lastLoginAt": null
}
```

**Errors:**
- 400: Validation error
- 401: Not authenticated
- 403: Missing users.update permission
- 404: User not found
- 409: Email already exists (if changed)

#### DELETE /api/users/:id
Delete a user account.

**Authentication:** Required
**Permission:** users.delete

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Business Rules:**
- Cannot delete yourself
- Cannot delete the last admin user
- Cascade deletes related data

**Errors:**
- 400: Cannot delete self or last admin
- 401: Not authenticated
- 403: Missing users.delete permission
- 404: User not found

#### POST /api/users/:id/change-password
Change user password.

**Authentication:** Required
**Permission:** Own account OR users.update

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Authorization Logic:**
- Users can change their own password (requires current password)
- Admins can change any user's password (no current password required)

**Errors:**
- 400: Validation error (password too short)
- 401: Not authenticated or incorrect current password
- 403: Insufficient permissions
- 404: User not found

#### GET /api/users/me/settings
Get all settings for current user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "theme_mode": "dark",
  "primary_color": "blue",
  "sidebar_collapsed": "false",
  "view_mode": "grid",
  "card_size": "medium"
}
```

#### PATCH /api/users/me/settings
Update multiple settings for current user.

**Authentication:** Required

**Request Body:**
```json
{
  "theme_mode": "light",
  "primary_color": "green",
  "card_size": "large"
}
```

**Response (200 OK):**
```json
{
  "theme_mode": "light",
  "primary_color": "green",
  "sidebar_collapsed": "false",
  "view_mode": "grid",
  "card_size": "large"
}
```

### Service Layer

**UserService Implementation:**

```typescript
class UserService {
  // Get all users with pagination
  async getUsers(page: number, limit: number): Promise<PaginatedResult<User>> {
    const offset = (page - 1) * limit;

    const users = UserDatabaseService.all(
      `SELECT u.*, r.name as roleName
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countResult = UserDatabaseService.get(
      'SELECT COUNT(*) as count FROM users',
      []
    );

    return {
      data: users,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }

  // Create new user
  async createUser(data: CreateUserDto): Promise<User> {
    // Check unique constraints
    this.validateUniqueUsername(data.username);
    this.validateUniqueEmail(data.email);

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Insert user
    const result = UserDatabaseService.run(
      `INSERT INTO users (username, email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [data.username, data.email, passwordHash, data.roleId, data.isActive ?? true]
    );

    // Return created user
    return this.getUserById(result.lastInsertRowid as number);
  }

  // Update user
  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const user = this.getUserById(id);
    if (!user) throw new AppError(404, 'User not found');

    // Check email uniqueness if changed
    if (data.email && data.email !== user.email) {
      this.validateUniqueEmail(data.email);
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.roleId !== undefined) {
      updates.push('role_id = ?');
      values.push(data.roleId);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    updates.push("updated_at = datetime('now')");

    values.push(id);

    UserDatabaseService.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getUserById(id);
  }

  // Delete user
  async deleteUser(id: number, currentUserId: number): Promise<void> {
    const user = this.getUserById(id);
    if (!user) throw new AppError(404, 'User not found');

    // Cannot delete self
    if (id === currentUserId) {
      throw new AppError(400, 'Cannot delete your own account');
    }

    // Cannot delete last admin
    if (user.roleId === 1) { // Admin role
      const adminCount = UserDatabaseService.get(
        'SELECT COUNT(*) as count FROM users WHERE role_id = 1',
        []
      );

      if (adminCount.count <= 1) {
        throw new AppError(400, 'Cannot delete the last administrator');
      }
    }

    // Delete user (cascade deletes handle related data)
    UserDatabaseService.run('DELETE FROM users WHERE id = ?', [id]);
  }

  // Change password
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = UserDatabaseService.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!user) throw new AppError(404, 'User not found');

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    UserDatabaseService.run(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [newPasswordHash, userId]
    );
  }
}
```

## UI Components

### UsersView
**Location:** `frontend/src/views/UsersView.tsx`

**Features:**
- User list table with pagination
- Create user button
- Edit/delete actions per user
- Active/inactive status badges
- Role display
- Last login timestamps

### UserTable
**Location:** `frontend/src/components/users/UserTable.tsx`

**Features:**
- Sortable columns
- Action buttons (edit, delete)
- Status indicators
- Responsive design
- Empty state handling

### UserForm
**Location:** `frontend/src/components/users/UserForm.tsx`

**Props:**
```typescript
interface UserFormProps {
  user?: User;           // For edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Features:**
- Create/edit modes
- Form validation (React Hook Form + Zod)
- Role selection dropdown
- Active status toggle
- Password field (create only)
- Error handling
- Loading states

### ChangePasswordDialog
**Location:** `frontend/src/components/users/ChangePasswordDialog.tsx`

**Features:**
- Current password input (for own password)
- New password input
- Password confirmation
- Strength indicator (future)
- Form validation
- Success feedback

## Common Use Cases

### 1. Create New User
```typescript
const createMutation = useCreateUser();

await createMutation.mutateAsync({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'secure123',
  roleId: 2,  // User role
  isActive: true
});

// User created and added to list
```

### 2. Update User Role
```typescript
const updateMutation = useUpdateUser();

await updateMutation.mutateAsync({
  userId: 10,
  data: {
    roleId: 3  // Change to guest role
  }
});

// User role updated, permissions changed
```

### 3. Deactivate User
```typescript
const updateMutation = useUpdateUser();

await updateMutation.mutateAsync({
  userId: 10,
  data: {
    isActive: false
  }
});

// User deactivated, cannot log in
```

### 4. Delete User
```typescript
const deleteMutation = useDeleteUser();

// Show confirmation
if (confirm(`Delete user ${user.username}?`)) {
  await deleteMutation.mutateAsync(userId);
  // User deleted, redirected to list
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

// Password changed, logout and re-login
```

### 6. Admin Changes User Password
```typescript
// Admin can change without current password
const changePasswordMutation = useChangePassword();

await changePasswordMutation.mutateAsync({
  userId: targetUserId,
  currentPassword: '', // Not required for admin
  newPassword: 'resetpass'
});

// User password reset by admin
```

## Permissions

User management operations require specific permissions:

- `users.read` - View user list and details
- `users.create` - Create new user accounts
- `users.update` - Update user information and roles
- `users.delete` - Delete user accounts

**Default Permission Assignments:**
- **Admin:** All user management permissions
- **User:** None (can only manage own account)
- **Guest:** None

## Business Rules

### User Creation
1. Username must be unique (case-insensitive)
2. Email must be unique (case-insensitive)
3. Password must meet minimum length requirement
4. Role must exist in system
5. Default role is "user" if not specified
6. Account is active by default

### User Update
1. Cannot change username (immutable after creation)
2. Email must remain unique if changed
3. Can change role to any valid role
4. Can toggle active status
5. Updated timestamp automatically set

### User Deletion
1. Cannot delete yourself
2. Cannot delete last admin user
3. Must confirm deletion
4. Cascade deletes:
   - Refresh tokens
   - Play sessions
   - User settings
5. Activity logs preserved (user_id set to NULL)

### Password Changes
1. Users can change own password (requires current password)
2. Admins can change any password (no current password required)
3. New password must meet minimum length
4. Password is hashed with bcrypt before storage
5. Old password remains valid until new one is set

## Best Practices

1. **Always verify permissions** before showing admin UI
2. **Confirm destructive actions** (delete user)
3. **Validate input** on both client and server
4. **Show loading states** during operations
5. **Handle errors gracefully** with user feedback
6. **Log admin actions** for audit trail
7. **Prevent self-deletion** to avoid lockouts
8. **Maintain at least one admin** in system
9. **Use strong passwords** and enforce complexity
10. **Deactivate instead of delete** when possible

## Troubleshooting

### Cannot create user
- Check username/email uniqueness
- Verify password meets requirements
- Ensure role exists
- Check permissions (users.create)

### Cannot delete user
- Verify not deleting self
- Check if last admin user
- Ensure users.delete permission
- Look for foreign key constraints

### Password change fails
- Verify current password is correct
- Check new password meets requirements
- Ensure user exists and is active
- Validate permissions

### User list not loading
- Check users.read permission
- Verify database connection
- Look for query errors in logs
- Check pagination parameters

## Future Enhancements

- Bulk user operations
- User import/export (CSV)
- Advanced user search and filtering
- User groups/teams
- Password complexity requirements
- Password expiration policies
- Account lockout after failed attempts
- Email verification workflow
- User profile pictures
- Activity timeline per user
- User impersonation (for support)
- Audit log for user changes
- User onboarding workflow
- Custom user fields/metadata
