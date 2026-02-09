import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useAuth } from '@/contexts/AuthContext';

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isMaintenanceMode } = useAuthStore();
  const { checkMaintenanceMode } = useAuth();

  const isAdmin = user?.permissions?.includes('settings.update');

  const checkMaintenanceModeRef = useRef(checkMaintenanceMode);
  checkMaintenanceModeRef.current = checkMaintenanceMode;

  useEffect(() => {
    if (location.pathname === '/maintenance' || location.pathname === '/login') {
      return;
    }

    if (isMaintenanceMode && !isAdmin) {
      navigate('/maintenance', { replace: true });
      return;
    }

    const checkMaintenance = async () => {
      const isActive = await checkMaintenanceModeRef.current();
      if (isActive && !isAdmin) {
        navigate('/maintenance', { replace: true });
      }
    };

    checkMaintenance();

    const interval = setInterval(checkMaintenance, 30000);

    return () => clearInterval(interval);
  }, [isMaintenanceMode, isAdmin, navigate, location.pathname]);

  if (isMaintenanceMode && !isAdmin && location.pathname !== '/maintenance') {
    return null;
  }

  return <>{children}</>;
}
