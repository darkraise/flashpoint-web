import { ReactNode } from 'react';
import { useAuthStore } from '../../store/auth';

interface RoleGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAllPermissions?: boolean;
  role?: string;
  fallback?: ReactNode;
}

/**
 * RoleGuard component
 * Conditionally renders children based on permissions or roles
 * Used for showing/hiding UI elements based on user permissions
 */
export function RoleGuard({
  children,
  permission,
  permissions,
  requireAllPermissions = false,
  role,
  fallback = null
}: RoleGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = useAuthStore();

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions (any or all)
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  // Check role
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
