# Auth Components

Documentation for authentication and authorization components.

## ProtectedRoute

Route wrapper component that handles authorization and route protection.

**Location:** `frontend/src/components/auth/ProtectedRoute.tsx`

### Props

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Default: true
  requirePermission?: string; // Single permission
  requireAnyPermission?: string[]; // Any of these permissions
  requireAllPermissions?: string[]; // All of these permissions
}
```

### Behavior

1. **Public Routes** (`requireAuth={false}`)
   - Accessible to everyone (including guests)
   - Example: Browse, Game Detail

2. **Authenticated Routes** (default)
   - Requires login
   - Redirects to `/login` if not authenticated

3. **Permission-Based Routes**
   - Checks specific permissions from user's role
   - Redirects to `/unauthorized` if lacking permission

### Usage

```typescript
// Public route
<Route path="/browse" element={
  <ProtectedRoute requireAuth={false}>
    <BrowseView />
  </ProtectedRoute>
} />

// Authenticated route
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardView />
  </ProtectedRoute>
} />

// Permission-based route
<Route path="/games/:id/play" element={
  <ProtectedRoute requirePermission="games.play">
    <GamePlayerView />
  </ProtectedRoute>
} />

// Multiple permissions (any)
<ProtectedRoute requireAnyPermission={['users.read', 'roles.read']}>
  <ManagementView />
</ProtectedRoute>

// Multiple permissions (all)
<ProtectedRoute requireAllPermissions={['users.read', 'users.write', 'users.delete']}>
  <FullUserManagement />
</ProtectedRoute>
```

## LoginForm

Login form component with validation.

**Location:** `frontend/src/components/auth/LoginForm.tsx`

### Features

- Username/password inputs
- Form validation
- Error display
- Guest mode option
- "Remember me" checkbox
- Link to registration

### Usage

```typescript
<LoginForm
  onSuccess={() => navigate('/dashboard')}
  onGuestMode={() => setGuestMode()}
/>
```

## RegisterForm

User registration form with validation.

**Location:** `frontend/src/components/auth/RegisterForm.tsx`

### Features

- Username, email, password inputs
- Password confirmation
- Validation rules
- Error display
- Link to login

## RoleGuard

Component wrapper that conditionally renders based on permissions.

**Location:** `frontend/src/components/common/RoleGuard.tsx`

### Props

```typescript
interface RoleGuardProps {
  children: React.ReactNode;
  permission?: string; // Single permission
  permissions?: string[]; // Any of these
  requireAll?: boolean; // Require all permissions
}
```

### Usage

```typescript
// Show only if user has permission
<RoleGuard permission="users.read">
  <UsersLink />
</RoleGuard>

// Show if user has any permission
<RoleGuard permissions={['users.read', 'roles.read', 'activities.read']}>
  <ManagementSection />
</RoleGuard>

// Show only if user has all permissions
<RoleGuard permissions={['users.read', 'users.write', 'users.delete']} requireAll>
  <FullUserManagement />
</RoleGuard>
```

## Further Reading

- [Auth Store Documentation](../state-management/zustand-stores.md#useauthstore)
- [Views and Routing](../views-routing.md)
