import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { authSettingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
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

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const location = useLocation();
  const { login, loginAsGuest } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/';

  // Fetch auth settings to check if registration is enabled
  const { data: authSettings } = useQuery({
    queryKey: ['authSettings'],
    queryFn: () => authSettingsApi.get()
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
    } catch (error: any) {
      logger.error('Login error:', error);
      setError(error?.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Sign in to access Flashpoint Archive
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-5">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your username"
                      autoFocus
                      autoComplete="username"
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
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-11"
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
                className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
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
                  className="w-full h-11 text-base font-medium"
                  onClick={loginAsGuest}
                >
                  Browse as Guest
                </Button>
              )}
            </div>
          </form>
        </Form>

        {authSettings?.userRegistrationEnabled && (
          <div className="relative mt-6 pt-6 border-t">
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
