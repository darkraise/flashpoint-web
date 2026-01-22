import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useAuth } from '@/contexts/AuthContext';

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

/**
 * MaintenanceGuard - Redirects non-admin users to maintenance page when maintenance mode is active
 *
 * This component:
 * - Checks if maintenance mode is active
 * - Allows admin users (with settings.update permission) to access the app normally
 * - Redirects non-admin users to /maintenance page
 * - Blocks all navigation attempts (including address bar navigation)
 */
export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isMaintenanceMode } = useAuthStore();
  const { checkMaintenanceMode } = useAuth();

  // Check if user is admin (has settings.update permission)
  const isAdmin = user?.permissions?.includes('settings.update');

  useEffect(() => {
    // Don't check if already on maintenance page or login page
    if (location.pathname === '/maintenance' || location.pathname === '/login') {
      return;
    }

    // If maintenance mode is active and user is not admin, redirect to maintenance page
    if (isMaintenanceMode && !isAdmin) {
      navigate('/maintenance', { replace: true });
      return;
    }

    // Check maintenance mode status from server
    const checkMaintenance = async () => {
      const isActive = await checkMaintenanceMode();
      if (isActive && !isAdmin) {
        navigate('/maintenance', { replace: true });
      }
    };

    // Check immediately
    checkMaintenance();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);

    return () => clearInterval(interval);
  }, [isMaintenanceMode, isAdmin, navigate, location.pathname, checkMaintenanceMode]);

  // If maintenance mode is active and user is not admin, don't render children
  if (isMaintenanceMode && !isAdmin && location.pathname !== '/maintenance') {
    return null;
  }

  return <>{children}</>;
}
