import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSharedPlaylistAccess } from '../../hooks/useSharedPlaylistAccess';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requirePermission?: string;
  requirePermissions?: string[];
  requireAllPermissions?: boolean;
  requireRole?: string;
  requireFeature?: 'enablePlaylists' | 'enableFavorites' | 'enableStatistics';
  fallbackPath?: string;
  allowSharedAccess?: boolean; // NEW: Allow access via shared playlist token
}

/**
 * ProtectedRoute component
 * Protects routes based on authentication, permissions, roles, and feature flags
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requirePermission,
  requirePermissions,
  requireAllPermissions = false,
  requireRole,
  requireFeature,
  fallbackPath = '/login',
  allowSharedAccess = false, // NEW
}: ProtectedRouteProps) {
  const location = useLocation();
  const {
    isAuthenticated,
    isGuest,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions: hasAll,
    hasRole,
  } = useAuthStore();
  const featureFlags = useFeatureFlags();

  // Get gameId from route params if checking shared access
  const params = useParams<{ id?: string }>();
  const gameId = params.id || null;

  // Check shared playlist access if enabled
  const { hasAccess: hasSharedAccess, isLoading: isCheckingShared } = useSharedPlaylistAccess(
    allowSharedAccess ? gameId : null
  );

  // Show loading while checking shared access
  if (allowSharedAccess && isCheckingShared) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Grant access if shared access is valid (bypass auth requirements)
  if (allowSharedAccess && hasSharedAccess) {
    return <>{children}</>;
  }

  // Check authentication - allow guests if not strictly requiring auth
  if (requireAuth && !isAuthenticated && !isGuest) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check feature flag
  if (requireFeature && !featureFlags[requireFeature]) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          requiredFeature: requireFeature,
          fromPath: location.pathname,
        }}
        replace
      />
    );
  }

  // Check single permission
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          requiredPermission: requirePermission,
          fromPath: location.pathname,
        }}
        replace
      />
    );
  }

  // Check multiple permissions (any or all)
  if (requirePermissions && requirePermissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? hasAll(requirePermissions)
      : hasAnyPermission(requirePermissions);

    if (!hasRequiredPermissions) {
      return (
        <Navigate
          to="/unauthorized"
          state={{
            requiredPermission: requirePermissions.join(', '),
            fromPath: location.pathname,
          }}
          replace
        />
      );
    }
  }

  // Check role
  if (requireRole && !hasRole(requireRole)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          requiredPermission: `role:${requireRole}`,
          fromPath: location.pathname,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}
