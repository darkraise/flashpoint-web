# Authentication & Authorization

## Overview

The Flashpoint Web application implements a comprehensive authentication and authorization system using JWT (JSON Web Tokens) and Role-Based Access Control (RBAC). This feature enables secure user registration, login, session management, and fine-grained permission control across the application.

## User-Facing Functionality

### Registration
- Users can create new accounts with username, email, and password
- Registration can be enabled/disabled by administrators via system settings
- Usernames and emails must be unique (case-insensitive)
- Password requirements: minimum 6 characters
- New users are automatically assigned the "user" role by default
- Activity is logged for audit purposes

### Login
- Users authenticate with username and password
- Guest access available without authentication (if enabled)
- Failed login attempts are tracked and rate-limited
- Account lockout after 5 failed attempts (configurable)
- Lockout duration: 15 minutes by default
- IP address and user agent tracked for security

### Session Management
- JWT-based access tokens (1 hour expiration)
- Refresh tokens for extended sessions (30 days)
- Tokens stored in localStorage on client-side
- Automatic token refresh before expiration
- Logout revokes refresh token server-side

### Guest Mode
- Browse games without authentication
- Limited to read-only permissions
- Cannot play games or create playlists
- Can be enabled/disabled by administrators

### User Profile
- View and update account information
- Change password (requires current password verification)
- Customize theme preferences (color scheme, surface color)
- View role and assigned permissions

## Technical Implementation

### Architecture

**Backend Components:**
- `AuthService`: Core authentication logic
- `AuthController` (routes/auth.ts): REST API endpoints
- JWT utilities (utils/jwt.ts): Token generation and verification
- Password utilities (utils/password.ts): Bcrypt hashing
- RBAC middleware (middleware/rbac.ts): Permission checking
- Auth middleware (middleware/auth.ts): JWT validation

**Frontend Components:**
- `AuthContext`: React context for auth state
- `LoginForm`: Login UI component
- `RegisterForm`: Registration UI component
- `ProtectedRoute`: Route guard component
- `useAuth` hook: Authentication operations
- Auth store (store/auth.ts): Zustand state management

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
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

**refresh_tokens table:**
```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**login_attempts table:**
```sql
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN DEFAULT 0,
  attempted_at TEXT DEFAULT (datetime('now'))
);
```

**system_settings table (auth category):**

Authentication settings are stored in the `system_settings` table with `category = 'auth'`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| guestAccessEnabled | boolean | true | Allow guest browsing without login |
| userRegistrationEnabled | boolean | true | Allow new user registration |
| maxLoginAttempts | number | 5 | Maximum failed login attempts before lockout |
| lockoutDurationMinutes | number | 15 | Account lockout duration after max attempts |

Settings are managed via `SystemSettingsService` with caching and validation.

### API Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string (3-50 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "permissions": ["games.read", "games.play", ...],
    "themeColor": "blue-500",
    "surfaceColor": "slate-700"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "expiresIn": 3600
  }
}
```

**Errors:**
- 400: Validation error
- 403: Registration disabled
- 409: Username or email already exists

#### POST /api/auth/login
Authenticate with username and password.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "admin",
    "permissions": ["games.read", "users.create", ...],
    "themeColor": "blue-500",
    "surfaceColor": "slate-700"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "expiresIn": 3600
  }
}
```

**Errors:**
- 401: Invalid credentials
- 429: Too many failed login attempts (account locked)

#### POST /api/auth/logout
Revoke refresh token and logout.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 3600
}
```

**Errors:**
- 401: Invalid or expired refresh token

#### GET /api/auth/me
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user",
  "permissions": ["games.read", "games.play", ...]
}
```

**Errors:**
- 401: No token provided or invalid token

### Authentication Flow

1. **Registration:**
   - User submits registration form
   - Backend validates input (unique username/email, password strength)
   - Password is hashed using bcrypt (10 rounds)
   - User record created with default "user" role
   - Access token and refresh token generated
   - Activity logged
   - Tokens returned to client

2. **Login:**
   - User submits credentials
   - Backend checks login attempts and lockout status
   - User fetched from database (case-insensitive username)
   - Password verified against bcrypt hash
   - Login attempt recorded (success/failure)
   - If successful: last_login_at updated
   - User permissions loaded from role
   - Tokens generated and stored
   - Activity logged

3. **Token Validation:**
   - Client includes JWT in Authorization header
   - Auth middleware extracts and verifies token
   - Token payload decoded (userId, username, role)
   - User fetched from database with current data
   - Permissions loaded and attached to request
   - Request proceeds to route handler

4. **Permission Checking:**
   - RBAC middleware checks user permissions
   - User must have at least one required permission
   - If authorized: request continues
   - If unauthorized: 403 Forbidden returned

5. **Token Refresh:**
   - Client detects token near expiration
   - Refresh token sent to /api/auth/refresh
   - Backend validates refresh token (not revoked, not expired)
   - New access token generated
   - New refresh token generated (rotation)
   - **Old refresh token automatically revoked** (security best practice)
   - New tokens returned to client

### Permission Caching

**Performance Optimization** (Added in v1.2.0):

The application implements an in-memory permission caching system to reduce database queries by over 90%.

**Cache Architecture:**
- **User permissions**: 5-minute TTL (Time To Live)
- **Role permissions**: 10-minute TTL
- **Automatic cleanup**: Every 5 minutes
- **Invalidation**: Automatic when permissions change

**Implementation:**
```typescript
// Permission check flow
1. User makes authenticated request
2. System checks PermissionCache for user permissions
3. If cache hit: use cached permissions (no database query)
4. If cache miss: query database, cache result, use permissions
5. Cache automatically invalidated on role/permission changes
```

**Cache Management Endpoints** (Admin only):
- `GET /_cache/permissions/stats` - View cache statistics
- `POST /_cache/permissions/clear` - Manually clear cache

**Performance Impact:**
- Before caching: ~50-100ms per permission check
- After caching: ~1-5ms per permission check (95%+ faster)
- Reduces database load significantly under high traffic

**Invalidation Strategy:**
- User role changes → Invalidate user's permission cache
- Role permissions updated → Invalidate role cache
- Manual invalidation available via API endpoint

### Security Features

**Password Security:**
- Bcrypt hashing with 10 salt rounds
- Minimum 6 character requirement
- Password not returned in API responses

**Token Security:**
- Access tokens expire in 1 hour
- Refresh tokens expire in 30 days
- Tokens use HS256 algorithm with secret key
- JWT_SECRET should be changed in production
- **Automatic refresh token revocation** on token refresh
- **Bulk token revocation** available (admin can revoke all user tokens)
- Refresh tokens tracked in database with revocation timestamps

**Rate Limiting:**
- 5 failed login attempts before lockout (configurable)
- 15 minute lockout duration (configurable)
- Tracking by both username and IP address
- Old login attempts cleaned up after 24 hours

**Session Security:**
- IP address and user agent tracked per session
- Activity logging for audit trail
- Tokens stored in localStorage (client-side)
- HTTPS recommended for production

## UI Components

### LoginForm
**Location:** `frontend/src/components/auth/LoginForm.tsx`

**Features:**
- Username and password inputs with validation
- Form validation using React Hook Form + Zod
- Error display for invalid credentials
- Loading state during authentication
- "Browse as Guest" button
- Link to registration page

**Usage:**
```tsx
import { LoginForm } from '@/components/auth/LoginForm';

<LoginForm />
```

### RegisterForm
**Location:** `frontend/src/components/auth/RegisterForm.tsx`

**Features:**
- Username, email, and password inputs
- Real-time validation feedback
- Password strength indicator
- Error handling for duplicate accounts
- Success redirect to dashboard

### ProtectedRoute
**Location:** `frontend/src/components/auth/ProtectedRoute.tsx`

**Features:**
- Route-level authentication guard
- Permission-based access control
- Redirect to login if not authenticated
- Redirect to unauthorized page if insufficient permissions

**Usage:**
```tsx
<ProtectedRoute requiredPermissions={['users.read']}>
  <UsersView />
</ProtectedRoute>
```

## Permissions System

### Default Roles

**Admin (priority: 100):**
- All permissions granted
- Can manage users, roles, and settings
- Full access to all features

**User (priority: 50):**
- games.read, games.play, games.download
- playlists.read, playlists.create, playlists.update, playlists.delete
- Cannot manage users, roles, settings, or view activity logs

**Guest (priority: 0):**
- games.read
- playlists.read
- Read-only access only

### Permission List

**Games:**
- `games.read` - View and browse games
- `games.play` - Play games in browser
- `games.download` - Download game files

**Playlists:**
- `playlists.read` - View playlists
- `playlists.create` - Create new playlists
- `playlists.update` - Update existing playlists
- `playlists.delete` - Delete playlists

**Users:**
- `users.read` - View user accounts
- `users.create` - Create new user accounts
- `users.update` - Update user accounts
- `users.delete` - Delete user accounts

**Roles:**
- `roles.read` - View roles and permissions
- `roles.create` - Create new roles
- `roles.update` - Update roles and permissions
- `roles.delete` - Delete roles

**Settings:**
- `settings.read` - View system settings
- `settings.update` - Update system settings

**Activities:**
- `activities.read` - View activity logs

## Common Use Cases

### 1. User Registration
```typescript
// Frontend
const registerMutation = useRegister();

await registerMutation.mutateAsync({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'secure123'
});

// Redirects to dashboard after successful registration
```

### 2. User Login
```typescript
// Frontend
const loginMutation = useLogin();

await loginMutation.mutateAsync({
  username: 'johndoe',
  password: 'secure123'
});

// Stores tokens in localStorage and updates auth context
```

### 3. Guest Access
```typescript
// Frontend
const { loginAsGuest } = useAuth();

loginAsGuest();
// Sets guest mode flag without authentication
```

### 4. Protected Route
```tsx
// Route definition
<Route path="/admin/users" element={
  <ProtectedRoute requiredPermissions={['users.read']}>
    <UsersView />
  </ProtectedRoute>
} />
```

### 5. Permission-Based UI
```tsx
// Component with permission check
const { hasPermission } = useAuth();

{hasPermission('users.create') && (
  <Button onClick={handleCreateUser}>Create User</Button>
)}
```

### 6. Change Password
```typescript
// Backend endpoint
POST /api/users/:id/change-password
{
  "currentPassword": "old123",
  "newPassword": "new456"
}

// Users can change their own password
// Admins can change any user's password without current password
```

## Configuration

### Environment Variables

**Backend (.env):**
```bash
# JWT secret key (change in production)
JWT_SECRET=your-secret-key-here

# Token expiration times
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS origin (frontend URL)
CORS_ORIGIN=http://localhost:5173
```

### Auth Settings (Database)

Authentication settings are stored in the `system_settings` table and can be updated via:

**Admin Interface:**
- Navigate to Settings > General tab > Authentication Settings
- Toggle settings and they are saved automatically

**Direct Database Update:**
```sql
-- Update guest access setting
UPDATE system_settings
SET value = 'true'
WHERE category = 'auth' AND key = 'guestAccessEnabled';

-- Update user registration setting
UPDATE system_settings
SET value = 'true'
WHERE category = 'auth' AND key = 'userRegistrationEnabled';

-- Update max login attempts
UPDATE system_settings
SET value = '5'
WHERE category = 'auth' AND key = 'maxLoginAttempts';

-- Update lockout duration
UPDATE system_settings
SET value = '15'
WHERE category = 'auth' AND key = 'lockoutDurationMinutes';
```

**Via API:**
```bash
# Update auth settings (requires admin permissions)
curl -X PATCH http://localhost:3100/api/settings/auth \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userRegistrationEnabled": true,
    "guestAccessEnabled": true,
    "maxLoginAttempts": 5,
    "lockoutDurationMinutes": 15
  }'
```

## Best Practices

1. **Always use HTTPS in production** to protect tokens in transit
2. **Change JWT_SECRET** from default value in production
3. **Implement token rotation** on refresh for enhanced security
4. **Monitor login attempts** for suspicious activity
5. **Regular cleanup** of expired tokens and old login attempts
6. **Use strong passwords** and consider implementing password complexity rules
7. **Enable email verification** for production environments (when implemented)
8. **Audit activity logs** regularly for security monitoring

## Troubleshooting

### "Invalid credentials" error
- Verify username and password are correct
- Check if account is active (is_active = 1)
- Ensure password was hashed correctly during registration

### "Too many login attempts" error
- Wait for lockout duration to expire (15 minutes default)
- Or manually clear login attempts from database
- Check if IP address or username is being rate-limited

### Token expired errors
- Implement automatic token refresh on client
- Check system clock synchronization
- Verify JWT expiration times in configuration

### Permission denied errors
- Verify user has correct role assigned
- Check role-permission mappings in database
- Ensure permissions are loaded correctly in token

## Future Enhancements

- Email verification for new accounts
- Password reset via email
- Two-factor authentication (2FA)
- OAuth integration (Google, GitHub)
- Session management UI (view/revoke active sessions)
- Password complexity requirements
- Account recovery mechanisms
- Audit log viewer for administrators
