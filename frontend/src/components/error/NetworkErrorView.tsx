import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';
import { reportError } from './ErrorReporter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface NetworkErrorState {
  message?: string;
  url?: string;
  fromPath?: string;
}

export function NetworkErrorView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = (location.state as NetworkErrorState) || {};
  const { message, url, fromPath } = state;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);

      redirectTimeout.current = setTimeout(() => {
        if (fromPath) {
          navigate(fromPath, { replace: true });
        } else {
          navigate(-1);
        }
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
    };
  }, [navigate, fromPath]);

  const handleReport = async () => {
    await reportError({
      type: 'network_error',
      message: message || 'Network connection failed',
      url: url || window.location.pathname,
      context: {
        isOnline: navigator.onLine,
        fromPath,
      },
    });
  };

  const handleRetry = () => {
    if (fromPath) {
      navigate(fromPath, { replace: true });
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="relative">
      {showRestored ? (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert className="bg-emerald-500/10 border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              Connection restored! Redirecting...
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <ErrorPage
        type="network"
        message={message || (isOnline ? 'Network request failed' : 'You are currently offline')}
        onReport={handleReport}
        onRetry={handleRetry}
      />
    </div>
  );
}
