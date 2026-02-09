import { ReactNode, useState } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import {
  FileQuestion,
  AlertCircle,
  WifiOff,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ErrorPageProps {
  type: '404' | '500' | 'network' | '403';
  title?: string;
  message?: string;
  details?: string;
  errorCode?: string | number;
  showReportButton?: boolean;
  customActions?: ReactNode;
  onRetry?: () => void;
  onGoHome?: () => void;
  onReport?: () => Promise<void>;
}

const errorConfig = {
  '404': {
    defaultTitle: 'Page Not Found',
    defaultMessage: "The page you're looking for doesn't exist or has been moved.",
    icon: FileQuestion,
    iconColor: 'text-blue-500',
    badgeVariant: 'secondary' as const,
    helpText: [
      'Check the URL for typos',
      'Use the navigation menu to find what you need',
      'Return to the home page and start fresh',
    ],
  },
  '500': {
    defaultTitle: 'Internal Server Error',
    defaultMessage: 'Something went wrong on our end. Our team has been notified.',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    badgeVariant: 'destructive' as const,
    helpText: [
      'Try refreshing the page',
      'Wait a few minutes and try again',
      'Report this error if it persists',
      'Contact support if the problem continues',
    ],
  },
  network: {
    defaultTitle: 'Network Error',
    defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
    icon: WifiOff,
    iconColor: 'text-yellow-500',
    badgeVariant: 'secondary' as const,
    helpText: [
      'Check your internet connection',
      'Disable VPN or proxy if enabled',
      'Try again in a few moments',
      'Contact your network administrator if the issue persists',
    ],
  },
  '403': {
    defaultTitle: 'Access Forbidden',
    defaultMessage: "You don't have permission to access this resource.",
    icon: ShieldAlert,
    iconColor: 'text-orange-500',
    badgeVariant: 'secondary' as const,
    helpText: [
      'Log in with an account that has the required permissions',
      'Contact an administrator to request access',
      'Return to a page you have access to',
    ],
  },
};

export function ErrorPage({
  type,
  title,
  message,
  details,
  errorCode,
  showReportButton = true,
  customActions,
  onRetry,
  onGoHome,
  onReport,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const isDev = import.meta.env.DEV;

  const config = errorConfig[type];
  const Icon = config.icon;

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleReport = async () => {
    if (onReport && !isReporting && !hasReported) {
      setIsReporting(true);
      try {
        await onReport();
        setHasReported(true);
      } catch (error) {
        logger.error('Failed to report error:', error);
      } finally {
        setIsReporting(false);
      }
    }
  };

  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;
  const hasDetails = isDev && details;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <Icon className={`h-16 w-16 ${config.iconColor}`} />
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl font-bold">{displayTitle}</CardTitle>
                {errorCode ? <Badge variant={config.badgeVariant}>{errorCode}</Badge> : null}
              </div>
              <p className="text-muted-foreground">{displayMessage}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {hasDetails ? (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    {showDetails ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide Error Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show Error Details
                      </>
                    )}
                  </button>
                  {showDetails ? (
                    <pre className="mt-2 p-4 bg-muted rounded-md overflow-x-auto text-xs">
                      <code>{details}</code>
                    </pre>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">What you can do:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {config.helpText.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 justify-center">
          {customActions ? (
            customActions
          ) : (
            <>
              <Button onClick={handleGoHome} variant="default">
                Go to Home
              </Button>
              {onRetry ? (
                <Button onClick={handleRetry} variant="secondary">
                  Retry
                </Button>
              ) : null}
              {showReportButton && onReport && !hasReported ? (
                <Button onClick={handleReport} variant="outline" disabled={isReporting}>
                  {isReporting ? 'Reporting...' : 'Report Error'}
                </Button>
              ) : null}
              {hasReported ? (
                <span className="text-sm text-muted-foreground">✓ Error reported successfully</span>
              ) : null}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
