import { useEffect, useState, useRef } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/index';

type NetworkStatus = 'online' | 'offline' | 'slow';

export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [showBanner, setShowBanner] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setStatus('offline');
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setStatus('offline');
      setShowBanner(true);
    }

    const checkNetworkSpeed = () => {
      if (navigator.onLine) {
        const connection =
          navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (connection) {
          const effectiveType = connection.effectiveType;

          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            setStatus('slow');
            setShowBanner(true);

            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
              setShowBanner(false);
            }, 10000);
          } else {
            setStatus((prevStatus) => {
              if (prevStatus === 'slow') {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setShowBanner(false), 3000);
                return 'online';
              }
              return prevStatus;
            });
          }
        }
      }
    };

    const speedCheckInterval = setInterval(checkNetworkSpeed, 5000);
    checkNetworkSpeed();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(speedCheckInterval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-3 text-sm font-medium text-white transition-all duration-300',
        status === 'offline' && 'bg-red-600',
        status === 'slow' && 'bg-yellow-600'
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge
            variant={status === 'offline' ? 'destructive' : 'default'}
            className={cn(
              'flex items-center gap-2',
              status === 'slow' && 'bg-yellow-600 hover:bg-yellow-600'
            )}
          >
            {status === 'offline' ? (
              <WifiOff size={16} className="flex-shrink-0" />
            ) : (
              <Wifi size={16} className="flex-shrink-0" />
            )}
            <span>
              {status === 'offline' && 'No internet connection. Please check your network.'}
              {status === 'slow' &&
                'Slow network detected. Some features may be slower than usual.'}
            </span>
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBanner(false)}
          className="h-auto p-1 hover:bg-white/20 text-white hover:text-white"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
