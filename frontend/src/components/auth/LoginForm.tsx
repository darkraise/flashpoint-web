import React from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { authSettingsApi, systemSettingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/types/api-error';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LocationState {
  // Can be a full Location object (from ProtectedRoute) or a string (from UnauthorizedView)
  from?: string | { pathname: string; search?: string };
  setupComplete?: boolean;
}

/** Validate return URL to prevent open redirects */
function isValidReturnUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  // Must start with / and not be protocol-relative (//)
  return url.startsWith('/') && !url.startsWith('//');
}

/** Normalize location state to a path string, including search params */
function normalizeFromState(from: LocationState['from']): string | null {
  if (!from) return null;
  if (typeof from === 'string') {
    return isValidReturnUrl(from) ? from : null;
  }
  // Location object - combine pathname and search
  const path = from.pathname + (from.search ?? '');
  return isValidReturnUrl(path) ? path : null;
}

export function LoginForm() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, loginAsGuest } = useAuth();

  // Check query param first (survives cross-browser), then fall back to state
  const returnUrl = searchParams.get('returnUrl');
  const fromState = (location.state as LocationState)?.from;
  const from =
    (isValidReturnUrl(returnUrl) ? returnUrl : null) ||
    normalizeFromState(fromState) ||
    '/';
  const setupComplete = (location.state as LocationState)?.setupComplete ?? false;

  const { data: publicSettings, isSuccess: isPublicSettingsLoaded } = useQuery({
    queryKey: ['system-settings', 'public'],
    queryFn: () => systemSettingsApi.getPublic(),
  });

  // Skip auth settings fetch during maintenance mode to avoid 503 errors
  const { data: authSettings } = useQuery({
    queryKey: ['authSettings'],
    queryFn: () => authSettingsApi.get(),
    enabled: isPublicSettingsLoaded && !publicSettings?.app?.maintenanceMode,
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(values, from);
    } catch (error) {
      logger.error('Login error:', error);
      setError(getErrorMessage(error) || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div
        className="p-[2px] rounded-2xl relative"
        style={{
          background: `linear-gradient(135deg,
            hsl(var(--primary) / 0.6) 0%,
            hsl(var(--primary) / 0.3) 25%,
            hsl(var(--primary) / 0.5) 50%,
            hsl(var(--primary) / 0.3) 75%,
            hsl(var(--primary) / 0.6) 100%)`,
        }}
      >
        <div className="bg-card/70 backdrop-blur-xl shadow-2xl rounded-2xl px-8 py-6 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/12 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none"
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 pointer-events-none prismatic-form-glow"
            style={{
              background: `radial-gradient(
              ellipse 80% 60% at 50% 40%,
              hsl(var(--primary) / var(--prismatic-glow-opacity)) 0%,
              transparent 70%
            )`,
            }}
            aria-hidden="true"
          />

          <div className="absolute top-4 right-4 z-10">
            <ThemePicker />
          </div>

          <div className="relative mb-6 flex flex-col items-center">
            <div className="mb-4 w-24 h-24 flex items-center justify-center">
              <img
                src="/images/logo.png"
                alt="Flashpoint Archive"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground text-center mb-2 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Log in to access Flashpoint Archive
            </p>
          </div>

          {setupComplete && !error ? (
            <Alert
              className="mb-6 border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-100 animate-slide-in-down"
              role="alert"
              aria-live="polite"
            >
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="ml-2">
                <strong className="font-semibold">Setup Complete!</strong> Your administrator
                account has been created successfully. Please log in to continue.
              </AlertDescription>
            </Alert>
          ) : null}

          {publicSettings?.app?.maintenanceMode ? (
            <Alert
              className="mb-6 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100 animate-slide-in-down"
              role="alert"
              aria-live="polite"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="ml-2">
                <strong className="font-semibold">Maintenance Mode:</strong>{' '}
                {publicSettings?.app?.maintenanceMessage ||
                  'The system is currently under maintenance. Some features may be unavailable.'}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert
              variant="destructive"
              className="mb-6 animate-slide-in-down"
              role="alert"
              aria-live="assertive"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        autoFocus
                        autoComplete="username"
                        className="h-10 transition-all duration-200 focus:scale-[1.01] focus:ring-1 focus:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="h-10 transition-all duration-200 focus:scale-[1.01] focus:ring-1 focus:ring-primary/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-10 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Logging in...
                    </span>
                  ) : (
                    'Log In'
                  )}
                </Button>

                {authSettings?.guestAccessEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 text-base font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => loginAsGuest(from)}
                  >
                    Browse as Guest
                  </Button>
                ) : null}
              </div>
            </form>
          </Form>

          {authSettings?.userRegistrationEnabled ? (
            <div className="relative mt-6 pt-4 border-t border-border/50">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-primary font-semibold hover:underline transition-all"
                >
                  Create one now
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
