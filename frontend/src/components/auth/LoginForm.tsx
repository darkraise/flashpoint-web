import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { authSettingsApi, systemSettingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
import { getApiErrorMessage } from '@/utils/errorUtils';
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
import { AlertTriangle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: {
    pathname: string;
  };
}

export function LoginForm() {
  const location = useLocation();
  const { login, loginAsGuest } = useAuth();

  const from = (location.state as LocationState)?.from?.pathname || '/';

  // Fetch public settings first to check maintenance mode
  const { data: publicSettings, isSuccess: isPublicSettingsLoaded } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => systemSettingsApi.getPublic()
  });

  // Only fetch auth settings if NOT in maintenance mode (to avoid 503 errors)
  // Wait for public settings to load first, then only fetch if maintenance mode is disabled
  const { data: authSettings } = useQuery({
    queryKey: ['authSettings'],
    queryFn: () => authSettingsApi.get(),
    enabled: isPublicSettingsLoaded && !publicSettings?.app.maintenanceMode
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
      // AuthContext will handle navigation (including maintenance mode check)
      await login(values, from);
    } catch (error) {
      logger.error('Login error:', error);
      setError(
        getApiErrorMessage(error, 'Login failed. Please check your credentials.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md lg:max-w-lg animate-fade-in-up">
      {/* Gradient Border Wrapper */}
      <div
        className="p-[2px] rounded-2xl relative"
        style={{
          background: `linear-gradient(135deg,
            hsl(var(--primary) / 0.6) 0%,
            hsl(var(--primary) / 0.3) 25%,
            hsl(var(--primary) / 0.5) 50%,
            hsl(var(--primary) / 0.3) 75%,
            hsl(var(--primary) / 0.6) 100%)`
        }}
      >
        {/* Glassmorphism card with backdrop-blur */}
        <div className="bg-card/70 backdrop-blur-xl shadow-2xl rounded-2xl px-8 py-10 lg:px-10 lg:py-12 relative overflow-hidden">
        {/* Multi-layer gradient backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/12 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

        {/* Prismatic Light Glow - Simulates light cast through glass */}
        <div
          className="absolute inset-0 pointer-events-none prismatic-form-glow"
          style={{
            background: `radial-gradient(
              ellipse 80% 60% at 50% 40%,
              hsl(var(--primary) / var(--prismatic-glow-opacity)) 0%,
              transparent 70%
            )`
          }}
          aria-hidden="true"
        />

        {/* Theme Toggle in top-right corner - always visible */}
        <div className="absolute top-4 right-4 z-10">
          <ThemePicker />
        </div>

        {/* Logo and Title Section */}
        <div className="relative mb-8 flex flex-col items-center">
          <div className="mb-6 w-24 h-24 lg:w-28 lg:h-28 flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="Flashpoint Archive"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground text-center">
            Sign in to access Flashpoint Archive
          </p>
        </div>

        {/* Maintenance Mode Notice */}
        {publicSettings?.app.maintenanceMode && (
          <Alert
            className="mb-6 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100 animate-slide-in-down"
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="ml-2">
              <strong className="font-semibold">Maintenance Mode:</strong>{' '}
              {publicSettings.app.maintenanceMessage ||
                'The system is currently under maintenance. Some features may be unavailable.'}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert
            variant="destructive"
            className="mb-6 animate-slide-in-down"
            role="alert"
            aria-live="assertive"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-6">
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
                      className="h-12 transition-all duration-200 focus:scale-[1.01] focus:ring-2 focus:ring-primary/20"
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
                      className="h-12 transition-all duration-200 focus:scale-[1.01] focus:ring-2 focus:ring-primary/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              {authSettings?.guestAccessEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  onClick={loginAsGuest}
                >
                  Browse as Guest
                </Button>
              )}
            </div>
          </form>
        </Form>

        {authSettings?.userRegistrationEnabled && (
          <div className="relative mt-8 pt-6 border-t border-border/50">
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
        )}
        </div>
      </div>
    </div>
  );
}
