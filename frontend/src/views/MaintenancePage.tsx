import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

export function MaintenancePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { logout, checkMaintenanceMode } = useAuth();

  // Check if user is admin (has settings.update permission)
  const isAdmin = user?.permissions?.includes('settings.update');

  useEffect(() => {
    // If admin, redirect to dashboard
    if (isAdmin) {
      navigate('/');
      return;
    }

    // Poll maintenance mode status every 30 seconds
    const interval = setInterval(async () => {
      const isMaintenanceActive = await checkMaintenanceMode();
      if (!isMaintenanceActive) {
        // Maintenance mode disabled, redirect to home
        navigate('/');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAdmin, navigate, checkMaintenanceMode]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Under Maintenance
          </h1>
          <p className="text-muted-foreground text-lg">
            We're currently performing system maintenance to improve your experience.
          </p>
        </div>

        {/* Message */}
        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            The application is temporarily unavailable while we make important updates.
            We apologize for any inconvenience.
          </p>
          <p className="text-sm font-medium">
            Please check back shortly.
          </p>
        </div>

        {/* User info */}
        {user ? (
          <div className="text-sm text-muted-foreground">
            Logged in as: <span className="font-medium">{user.username}</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>

          {!user ? (
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          ) : null}

          {user ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleLogout}
            >
              Logout
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
