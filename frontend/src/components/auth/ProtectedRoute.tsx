import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requirePermission?: string;
  requirePermissions?: string[];
  requireAllPermissions?: boolean;
  requireRole?: string;
  fallbackPath?: string;
}

/**
 * ProtectedRoute component
 * Protects routes based on authentication, permissions, and roles
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requirePermission,
  requirePermissions,
  requireAllPermissions = false,
  requireRole,
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isGuest, hasPermission, hasAnyPermission, hasAllPermissions: hasAll, hasRole } = useAuthStore();

  // Check authentication - allow guests if not strictly requiring auth
  if (requireAuth && !isAuthenticated && !isGuest) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check single permission
  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check multiple permissions (any or all)
  if (requirePermissions && requirePermissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAll(requirePermissions)
      : hasAnyPermission(requirePermissions);

    if (!hasRequiredPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check role
  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
