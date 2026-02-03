import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/auth';

interface UnauthorizedState {
  requiredPermission?: string;
  requiredFeature?: string;
  fromPath?: string;
}

export function UnauthorizedView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, isAuthenticated } = useAuthStore();

  const state = (location.state as UnauthorizedState) || {};
  const { requiredPermission, requiredFeature, fromPath } = state;

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login', {
      state: { from: fromPath || location.pathname },
    });
  };

  const getTitle = () => {
    if (isGuest) {
      return 'Authentication Required';
    }
    return 'Access Forbidden';
  };

  const getMessage = () => {
    if (isGuest) {
      return 'You need to log in to access this resource.';
    }
    return "You don't have permission to access this resource.";
  };

  const getHelpText = () => {
    if (isGuest) {
      return [
        'Log in with an account that has the required permissions',
        "Create a new account if you don't have one",
        'Return to the home page to browse available content',
      ];
    }
    return [
      'Contact an administrator to request access',
      'Check your account permissions in settings',
      'Return to the home page',
    ];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-orange-500" />
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
                <Badge variant="secondary">403</Badge>
              </div>
              <p className="text-muted-foreground">{getMessage()}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isAuthenticated && user ? (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Current user:</p>
                  <div className="text-sm">
                    <p>
                      <span className="font-semibold">Username:</span> {user.username}
                    </p>
                    <p>
                      <span className="font-semibold">Role:</span> {user.role}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {requiredPermission || requiredFeature ? (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  {requiredPermission ? (
                    <p className="text-sm">
                      <span className="font-semibold">Required permission:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {requiredPermission}
                      </code>
                    </p>
                  ) : null}
                  {requiredFeature ? (
                    <p className="text-sm">
                      <span className="font-semibold">Required feature:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {requiredFeature}
                      </code>
                    </p>
                  ) : null}
                  {fromPath ? (
                    <p className="text-sm text-muted-foreground">Attempted to access: {fromPath}</p>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">What you can do:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {getHelpText().map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 justify-center">
          {isGuest ? (
            <>
              <Button onClick={handleLogin} variant="default">
                Log In
              </Button>
              <Button onClick={handleGoHome} variant="secondary">
                Go to Home
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleGoHome} variant="default">
                Go to Home
              </Button>
              {isAuthenticated ? (
                <Button onClick={() => navigate('/settings')} variant="secondary">
                  View Settings
                </Button>
              ) : null}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
