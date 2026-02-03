# Authentication & Authorization

## Overview

JWT-based authentication system with Role-Based Access Control (RBAC). Enables secure user registration, login, session management, and fine-grained permission control across the application.

## Architecture

**Backend Components:**
- `AuthService`: Core authentication logic
- Auth routes (routes/auth.ts): REST API endpoints
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

## API Endpoints

#### POST /api/auth/register
Register a new user account.
- **Body:** `{ "username", "email", "password" }`
- **Response:** User object + tokens (201)
- **Validation:** username 3-50 chars, email valid format, password min 6 chars
- **Errors:** 400 validation, 403 registration disabled, 409 duplicate username/email

#### POST /api/auth/login
Authenticate with username and password.
- **Body:** `{ "username", "password" }`
- **Response:** User object + tokens
- **Rate Limiting:** 5 failed attempts locks account for 15 minutes
- **Errors:** 401 invalid credentials, 429 too many attempts

#### POST /api/auth/logout
Revoke refresh token and logout.
- **Body:** `{ "refreshToken" }`
- **Response:** `{ "success": true }`

#### POST /api/auth/refresh
Refresh access token using refresh token.
- **Body:** `{ "refreshToken" }`
- **Response:** New access token + new refresh token
- **Note:** Old refresh token automatically revoked

#### GET /api/auth/me
Get current authenticated user information.
- **Headers:** `Authorization: Bearer {accessToken}`
- **Response:** User object with permissions

## Authentication Flow

1. **Registration:**
   - Validate input (unique username/email, password strength)
   - Hash password with bcrypt (10 rounds)
   - Create user record with default "user" role
   - Generate tokens
   - Log activity

2. **Login:**
   - Check login attempts and lockout status
   - Fetch user (case-insensitive username)
   - Verify password against bcrypt hash
   - Record login attempt
   - Update last_login_at
   - Load user permissions from role
   - Generate tokens

3. **Token Validation:**
   - Extract JWT from Authorization header
   - Verify token signature and expiration
   - Decode token payload
   - Fetch user with current data
   - Load and attach permissions

4. **Permission Checking:**
   - RBAC middleware checks user permissions
   - User must have at least one required permission
   - 403 Forbidden if unauthorized

5. **Token Refresh:**
   - Validate refresh token (not revoked, not expired)
   - Generate new access token
   - Generate new refresh token (rotation)
   - Revoke old refresh token automatically

## Default Roles

**Admin (priority: 100):**
- All permissions granted
- Can manage users, roles, and settings

**User (priority: 50):**
- games.read, games.play, games.download
- playlists.read, .create, .update, .delete
- Cannot manage users, roles, settings, or view activity logs

**Guest (priority: 0):**
- games.read, playlists.read
- Read-only access only

## Permissions

Complete permission list in [Role-Based Access Control](./07-role-permissions.md)

## Configuration

**Environment Variables (.env):**
```bash
JWT_SECRET=your-secret-key-here        # Change in production
JWT_EXPIRES_IN=1h                       # Token expiration
REFRESH_TOKEN_EXPIRES_IN=30d            # Refresh token expiration
DOMAIN=http://localhost:5173           # Frontend URL
```

**Auth Settings (Database):**
- `auth.guestAccessEnabled` - Allow guest browsing (default: true)
- `auth.userRegistrationEnabled` - Allow new user registration (default: true)
- `auth.maxLoginAttempts` - Before lockout (default: 5)
- `auth.lockoutDurationMinutes` - Lockout duration (default: 15)

## Security Features

**Password Security:**
- Bcrypt hashing with 10 salt rounds
- Minimum 6 character requirement
- Password not returned in API responses

**Token Security:**
- Access tokens expire in 1 hour
- Refresh tokens expire in 30 days
- Tokens use HS256 algorithm
- Automatic refresh token revocation on refresh
- Bulk token revocation available (admin)

**Rate Limiting:**
- 5 failed login attempts before lockout
- 15 minute lockout duration
- Tracking by both username and IP address
- Old login attempts cleaned up after 24 hours

**Session Security:**
- IP address and user agent tracked per session
- Activity logging for audit trail
- Tokens stored in localStorage (client-side)
- HTTPS recommended for production

## Common Use Cases

### 1. User Registration
```typescript
const registerMutation = useRegister();

await registerMutation.mutateAsync({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'secure123'
});
```

### 2. User Login
```typescript
const loginMutation = useLogin();

await loginMutation.mutateAsync({
  username: 'johndoe',
  password: 'secure123'
});
```

### 3. Guest Access
```typescript
const { loginAsGuest } = useAuth();

loginAsGuest();
```

### 4. Protected Route
```tsx
<Route path="/admin/users" element={
  <ProtectedRoute requiredPermissions={['users.read']}>
    <UsersView />
  </ProtectedRoute>
} />
```

### 5. Permission-Based UI
```tsx
const { hasPermission } = useAuth();

{hasPermission('users.create') && (
  <Button onClick={handleCreateUser}>Create User</Button>
)}
```

### 6. Change Password
```typescript
const mutation = useChangePassword();

await mutation.mutateAsync({
  userId: currentUser.id,
  currentPassword: 'old123',
  newPassword: 'new456'
});
```

## Best Practices

1. Always use HTTPS in production
2. Change JWT_SECRET from default in production
3. Implement token rotation on refresh
4. Monitor login attempts for suspicious activity
5. Regular cleanup of expired tokens and old login attempts
6. Use strong passwords
7. Enable email verification for production
8. Audit activity logs regularly

## Troubleshooting

**"Invalid credentials" error:**
- Verify username and password are correct
- Check if account is active (is_active = 1)
- Ensure password was hashed correctly during registration

**"Too many login attempts" error:**
- Wait for lockout duration to expire (15 minutes default)
- Or manually clear login attempts from database
- Check if IP address or username is being rate-limited

**Token expired errors:**
- Implement automatic token refresh on client
- Check system clock synchronization
- Verify JWT expiration times in configuration

**Permission denied errors:**
- Verify user has correct role assigned
- Check role-permission mappings in database
- Ensure permissions loaded correctly in token
