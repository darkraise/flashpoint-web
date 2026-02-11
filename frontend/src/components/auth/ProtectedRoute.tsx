import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useSharedPlaylistAccess } from '@/hooks/useSharedPlaylistAccess';
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
  allowSharedAccess?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requirePermission,
  requirePermissions,
  requireAllPermissions = false,
  requireRole,
  requireFeature,
  fallbackPath = '/login',
  allowSharedAccess = false,
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

  const params = useParams<{ id?: string }>();
  const gameId = params.id || null;

  const { hasAccess: hasSharedAccess, isLoading: isCheckingShared } = useSharedPlaylistAccess(
    allowSharedAccess ? gameId : null
  );

  if (allowSharedAccess && isCheckingShared) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Shared playlist access bypasses auth requirements
  if (allowSharedAccess && hasSharedAccess) {
    return <>{children}</>;
  }

  if (requireAuth && !isAuthenticated && !isGuest) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

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
