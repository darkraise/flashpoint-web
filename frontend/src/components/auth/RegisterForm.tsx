import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { authSettingsApi, systemSettingsApi } from '../../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/types/api-error';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { AlertTriangle } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  // Fetch public settings first to check maintenance mode
  const { data: publicSettings, isSuccess: isPublicSettingsLoaded } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => systemSettingsApi.getPublic()
  });

  // Only check if registration is enabled if NOT in maintenance mode (to avoid 503 errors)
  // Wait for public settings to load first, then only fetch if maintenance mode is disabled
  const { data: settings } = useQuery({
    queryKey: ['authSettings'],
    queryFn: () => authSettingsApi.get(),
    enabled: isPublicSettingsLoaded && !publicSettings?.app.maintenanceMode
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password
      });
      navigate('/', { replace: true });
    } catch (error) {
      // Error is already logged in the hook
    }
  };

  // Only show registration disabled screen if NOT in maintenance mode and registration is disabled
  if (!publicSettings?.app.maintenanceMode && settings && !settings.userRegistrationEnabled) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-card border shadow-xl rounded-2xl px-8 py-8 mb-4 relative overflow-hidden">
          {/* Decorative gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

          {/* Theme Toggle in top-right corner */}
          <div className="absolute top-4 right-4 z-10">
            <ThemePicker />
          </div>

          {/* Logo Section */}
          <div className="relative mb-8 flex flex-col items-center">
            <div className="mb-4 w-24 h-24 flex items-center justify-center">
              <img
                src="/images/logo.png"
                alt="Flashpoint Archive"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground text-center mb-2">
              Registration Disabled
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              User registration is currently disabled. Please contact an administrator for access.
            </p>
          </div>

          <div className="relative text-center">
            <Link to="/login" className="inline-flex items-center justify-center text-sm text-primary font-semibold hover:underline">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border shadow-xl rounded-2xl px-8 py-8 mb-4 relative overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

        {/* Theme Toggle in top-right corner */}
        <div className="absolute top-4 right-4 z-10">
          <ThemePicker />
        </div>

        {/* Logo and Title Section */}
        <div className="relative mb-8 flex flex-col items-center">
          <div className="mb-4 w-24 h-24 flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="Flashpoint Archive"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground text-center mb-2">
            Create Account
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Join Flashpoint Archive today
          </p>
        </div>

        {/* Maintenance Mode Notice */}
        {publicSettings?.app.maintenanceMode && (
          <Alert
            className="mb-6 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
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

        {registerMutation.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {getErrorMessage(registerMutation.error) || 'Registration failed. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Choose a username"
                      autoFocus
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="h-11"
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
                  <FormLabel className="text-sm font-semibold">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Create a strong password"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        </Form>

        <div className="relative mt-6 pt-6 border-t">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
