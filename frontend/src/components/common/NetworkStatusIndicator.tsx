import { useEffect, useState } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/index';

type NetworkStatus = 'online' | 'offline' | 'slow';

/**
 * NetworkStatusIndicator component displays a banner when network conditions are poor
 * - Shows offline message when no connection
 * - Shows slow connection warning when response times are high
 * - Automatically dismisses when connection improves
 */
export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if online/offline
    const handleOnline = () => {
      setStatus('online');
      setTimeout(() => setShowBanner(false), 3000); // Hide after 3s when back online
    };

    const handleOffline = () => {
      setStatus('offline');
      setShowBanner(true);
    };

    // Monitor network connection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) {
      setStatus('offline');
      setShowBanner(true);
    }

    // Monitor slow network conditions using Performance API
    let slowNetworkTimeout: NodeJS.Timeout;

    const checkNetworkSpeed = () => {
      if (navigator.onLine) {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

        if (connection) {
          // Use Network Information API if available
          const effectiveType = connection.effectiveType;

          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            setStatus('slow');
            setShowBanner(true);

            // Auto-hide slow warning after 10 seconds
            slowNetworkTimeout = setTimeout(() => {
              setShowBanner(false);
            }, 10000);
          } else if (status === 'slow') {
            setStatus('online');
            setTimeout(() => setShowBanner(false), 3000);
          }
        }
      }
    };

    // Check network speed periodically
    const speedCheckInterval = setInterval(checkNetworkSpeed, 5000);
    checkNetworkSpeed(); // Check immediately

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(speedCheckInterval);
      clearTimeout(slowNetworkTimeout);
    };
  }, [status]);

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
              "flex items-center gap-2",
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
              {status === 'slow' && 'Slow network detected. Some features may be slower than usual.'}
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
