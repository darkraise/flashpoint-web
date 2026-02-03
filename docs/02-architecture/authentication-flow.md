# Authentication Flow

## Overview

Flashpoint Web uses JWT-based authentication with role-based access control (RBAC).

## Authentication Architecture

```mermaid
graph TB
    subgraph "Frontend"
        LoginForm[Login Form]
        AuthStore[Zustand Auth Store]
        APIClient[Axios API Client]
        LocalStorage[localStorage]
    end

    subgraph "Backend"
        AuthRoute[Auth Routes]
        AuthMiddleware[Auth Middleware]
        AuthService[AuthService]
        UserDB[(user.db)]
    end

    subgraph "Protected Resources"
        GameRoutes[Game Routes]
        UserRoutes[User Routes]
        RBACMiddleware[RBAC Middleware]
    end

    LoginForm --> AuthStore
    AuthStore --> APIClient
    APIClient --> AuthRoute
    AuthRoute --> AuthService
    AuthService --> UserDB
    UserDB -.return user.-> AuthService
    AuthService -.JWT tokens.-> AuthRoute
    AuthRoute -.tokens + user.-> APIClient
    APIClient --> AuthStore
    AuthStore --> LocalStorage

    APIClient -.JWT Bearer.-> GameRoutes
    GameRoutes --> AuthMiddleware
    AuthMiddleware --> RBACMiddleware
    RBACMiddleware -.authorized.-> GameRoutes

    style AuthStore fill:#61dafb
    style AuthService fill:#90ee90
    style UserDB fill:#ff9999
```

## 1. User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant RegisterForm
    participant AuthStore
    participant API
    participant Backend
    participant AuthService
    participant UserDB

    User->>RegisterForm: Enter credentials
    User->>RegisterForm: Click "Register"

    RegisterForm->>RegisterForm: Validate form
    RegisterForm->>API: authApi.register(userData)

    API->>Backend: POST /api/auth/register
    Note over API,Backend: {username, email, password}

    Backend->>Backend: Validate request (Zod)
    Backend->>AuthService: register(userData)

    AuthService->>UserDB: Check username exists
    alt Username exists
        UserDB-->>AuthService: User found
        AuthService-->>Backend: Error: Username taken
        Backend-->>API: 409 Conflict
        API-->>RegisterForm: Show error
    else Username available
        UserDB-->>AuthService: No user
        AuthService->>AuthService: Hash password (bcrypt)
        AuthService->>UserDB: INSERT INTO users

        AuthService->>AuthService: Generate JWT tokens
        AuthService-->>Backend: {user, accessToken, refreshToken}
        Backend-->>API: 201 Created
        API->>AuthStore: setAuth(user, tokens)
        AuthStore->>LocalStorage: Persist tokens
        AuthStore-->>RegisterForm: Success
        RegisterForm->>User: Redirect to dashboard
    end
```

**Password Validation Schema**:
```typescript
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

## 2. User Login Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginForm
    participant AuthStore
    participant API
    participant Backend
    participant AuthService
    participant UserDB
    participant ThemeStore

    User->>LoginForm: Enter credentials
    User->>LoginForm: Click "Login"

    LoginForm->>API: authApi.login({username, password})
    API->>Backend: POST /api/auth/login

    Backend->>AuthService: login(credentials)
    AuthService->>UserDB: SELECT user WHERE username = ?
    UserDB-->>AuthService: User record with password_hash

    alt User not found or password invalid
        AuthService-->>Backend: Error: Invalid credentials
        Backend-->>API: 401 Unauthorized
        API-->>LoginForm: Show error
    else Valid credentials
        AuthService->>UserDB: SELECT user permissions
        AuthService->>AuthService: Generate JWT access token (15m expiry)
        AuthService->>AuthService: Generate JWT refresh token (7d expiry)
        AuthService-->>Backend: {user, accessToken, refreshToken}
        Backend-->>API: 200 OK with tokens

        API->>AuthStore: setAuth(user, tokens)
        AuthStore->>LocalStorage: Persist auth state
        AuthStore->>ThemeStore: loadThemeFromServer()
        AuthStore-->>LoginForm: Success
        LoginForm->>User: Redirect to /browse
    end
```

**JWT Token Structure**:
```typescript
// Access Token
{
  userId: 1,
  username: "user",
  email: "user@example.com",
  role: "user",
  permissions: ["games.read", "games.play"],
  iat: 1705579200,
  exp: 1705580100   // 15 minutes
}

// Refresh Token
{
  userId: 1,
  type: "refresh",
  iat: 1705579200,
  exp: 1706184000   // 7 days
}
```

## 3. Protected Request Flow

```mermaid
sequenceDiagram
    participant Component
    participant API Client
    participant Interceptor
    participant Backend
    participant AuthMiddleware
    participant RBACMiddleware
    participant RouteHandler

    Component->>API Client: gamesApi.search(filters)

    API Client->>Interceptor: Request interceptor
    Interceptor->>Interceptor: Add Authorization header
    Note over Interceptor: Authorization: Bearer {token}

    Interceptor->>Backend: GET /api/games?filters
    Backend->>AuthMiddleware: authenticate middleware

    AuthMiddleware->>AuthMiddleware: Extract & verify JWT
    alt Invalid/Expired token
        AuthMiddleware-->>Backend: 401 Unauthorized
        Backend-->>Interceptor: Error (triggers refresh)
    else Valid token
        AuthMiddleware->>Backend: Set req.user
        Backend->>RBACMiddleware: requirePermission('games.read')
        RBACMiddleware->>RBACMiddleware: Check permissions

        alt Missing permission
            RBACMiddleware-->>Backend: 403 Forbidden
        else Has permission
            RBACMiddleware->>RouteHandler: Execute handler
            RouteHandler-->>Backend: Game data
            Backend-->>API Client: 200 OK
            API Client-->>Component: Update state
        end
    end
```

**Authentication Middleware**:
```typescript
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await authService.getUserWithPermissions(decoded.userId);

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.roleName,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    next(new AppError(401, 'Invalid token'));
  }
};
```

**RBAC Middleware**:
```typescript
export const requirePermission = (permission: string) => {
  return (req, res, next) => {
    if (!req.user?.permissions.includes(permission)) {
      return next(new AppError(403, `Permission denied: ${permission}`));
    }
    next();
  };
};
```

## 4. Token Refresh Flow

```mermaid
sequenceDiagram
    participant Component
    participant API Client
    participant Interceptor
    participant AuthStore
    participant Backend
    participant AuthService

    Component->>API Client: gamesApi.search()
    API Client->>Backend: Request with expired token
    Backend-->>API Client: 401 Unauthorized

    API Client->>Interceptor: Response interceptor (401 check)
    Interceptor->>AuthStore: getState().refreshToken

    alt No refresh token
        Interceptor->>AuthStore: clearAuth()
        Interceptor->>Component: Redirect to login
    else Has refresh token
        Interceptor->>Backend: POST /api/auth/refresh {refreshToken}
        Backend->>AuthService: refreshAccessToken(token)

        alt Invalid refresh token
            AuthService-->>Backend: 401 Unauthorized
            Interceptor->>AuthStore: clearAuth()
            Interceptor->>Component: Redirect to login
        else Valid
            AuthService->>AuthService: Generate new tokens
            Backend-->>Interceptor: {accessToken, refreshToken}
            Interceptor->>AuthStore: updateAccessToken(newToken)
            Interceptor->>Interceptor: Retry original request
            Backend-->>API Client: 200 OK
            API Client-->>Component: Success
        end
    end
```

**Axios Response Interceptor**:
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const tokens = await authApi.refreshToken(refreshToken);
        useAuthStore.getState().updateAccessToken(tokens.accessToken);
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## 5. Logout Flow

```mermaid
sequenceDiagram
    participant User
    participant Header
    participant AuthStore
    participant API
    participant Backend

    User->>Header: Click "Logout"
    Header->>AuthStore: Get refreshToken
    Header->>API: authApi.logout(refreshToken)
    API->>Backend: POST /api/auth/logout
    Backend->>Backend: Invalidate refresh token
    Backend-->>API: 200 OK

    API->>AuthStore: clearAuth()
    AuthStore->>LocalStorage: Clear tokens
    AuthStore-->>Header: Success
    Header->>User: Redirect to /login
```

## 6. Role-Based Access Control

```mermaid
graph TB
    User[User]
    Role[Role]
    Permission[Permission]
    Resource[Protected Resource]

    User -->|assigned to| Role
    Role -->|has many| Permission
    Permission -->|grants access to| Resource

    style User fill:#61dafb
    style Role fill:#90ee90
    style Permission fill:#ffd700
    style Resource fill:#ffcccb
```

**Database Schema**:
```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

**Default Roles**:
- `admin`: Full system access
- `moderator`: Content management and user support
- `user`: Standard user features (games, playlists)
- `guest`: Read-only access (if enabled)

**Common Permissions**:
```
games.read, games.play
playlists.read, playlists.create, playlists.update, playlists.delete
users.read, users.create, users.update, users.delete
roles.read, roles.create, roles.update, roles.delete
settings.update
```

**Frontend Permission Checks**:
```typescript
export const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

// Usage
{hasPermission('users.create') && (
  <Button onClick={handleCreateUser}>Create User</Button>
)}
```

## 7. Guest Mode

When `auth.guest_access_enabled` is true in system settings, unauthenticated users can browse games with limited permissions.

```typescript
// Frontend
const guestUser: User = {
  id: 0,
  username: 'Guest',
  role: 'guest',
  permissions: ['games.read', 'games.play']
};

// Backend
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await authService.verifyAccessToken(token);
    req.user = user;
  } else {
    const settings = await authSettingsService.getSettings();
    if (!settings.guestAccessEnabled) {
      throw new AppError(401, 'Authentication required');
    }
    req.user = { id: 0, username: 'guest', role: 'guest', permissions: ['games.read'] };
  }

  next();
};
```

## Security Measures

**Password Security**: Bcrypt with 10 rounds

**JWT Security**:
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Signed with random 256-bit JWT_SECRET
- Verify algorithm: HS256

**Rate Limiting**: 5 login attempts per 15 minutes

**Input Sanitization**: Zod schema validation on all routes

**HTTPS**: Secure cookies in production only

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 on valid requests | Token expired | Automatic refresh in Axios interceptor |
| Infinite refresh loop | Refresh token also expired | Force logout and redirect to login |
| 403 despite logged in | Missing permission | Check user role and permissions in database |
| Guest access not working | Setting disabled | Verify `auth.guest_access_enabled` in system_settings |
| Admin gets 503 in maintenance | Unauthenticated request | Use authenticated `api` client, not raw `fetch()` |
