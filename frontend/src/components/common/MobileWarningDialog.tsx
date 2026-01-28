import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Monitor, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'flashpoint-mobile-warning-dismissed';

/**
 * Detect if user is on a mobile device
 */
function isMobileDevice(): boolean {
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  // Also check screen size (less than 768px width)
  const isSmallScreen = window.innerWidth < 768;

  return mobileRegex.test(userAgent) || isSmallScreen;
}

export function MobileWarningDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if warning has been dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);

    if (!dismissed && isMobileDevice()) {
      // Show warning after a short delay (500ms) for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    // Store dismissal in localStorage
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <Smartphone className="h-6 w-6 text-yellow-500" />
            Mobile Device Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-base">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <Monitor className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  Best Experience on PC
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This web application is optimized for desktop computers.
                  Flash and HTML5 games may not work properly on mobile devices.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Recommended:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Use a desktop or laptop computer</li>
                <li>Use Chrome, Firefox, or Edge browser</li>
                <li>Enable JavaScript and cookies</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              You can continue browsing, but some features may not function as expected.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss} className="w-full sm:w-auto">
            I Understand, Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
