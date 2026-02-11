import { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';

interface RoleGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAllPermissions?: boolean;
  role?: string;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  permission,
  permissions,
  requireAllPermissions = false,
  role,
  fallback = null,
}: RoleGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = useAuthStore();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
