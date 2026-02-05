import { useEffect, useState } from 'react';
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

  const state = (location.state as NetworkErrorState) || {};
  const { message, url, fromPath } = state;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);

      setTimeout(() => {
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
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
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
