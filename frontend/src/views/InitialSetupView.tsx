import { useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';
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
import { Shield } from 'lucide-react';

const setupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SetupFormValues = z.infer<typeof setupSchema>;

export function InitialSetupView() {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SetupFormValues) => {
    try {
      await registerMutation.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password,
      });
      // Navigate to login page after successful setup
      navigate('/login', {
        replace: true,
        state: { setupComplete: true },
      });
    } catch (error) {
      // Error is already logged in the hook
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Gradient Border Wrapper */}
        <div
          className="p-[2px] rounded-2xl relative animate-fade-in-up"
          style={{
            background: `linear-gradient(135deg,
              hsl(var(--primary) / 0.6) 0%,
              hsl(var(--primary) / 0.3) 25%,
              hsl(var(--primary) / 0.5) 50%,
              hsl(var(--primary) / 0.3) 75%,
              hsl(var(--primary) / 0.6) 100%)`,
          }}
        >
          {/* Glassmorphism card with backdrop-blur */}
          <div className="bg-card/70 backdrop-blur-xl shadow-2xl rounded-2xl px-8 py-6 relative overflow-hidden">
            {/* Multi-layer gradient backgrounds */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/12 pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />

            {/* Prismatic Light Glow */}
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

            {/* Theme Toggle in top-right corner */}
            <div className="absolute top-4 right-4 z-10">
              <ThemePicker />
            </div>

            {/* Logo and Title Section */}
            <div className="relative mb-6 flex flex-col items-center">
              <div className="mb-4 w-20 h-20 flex items-center justify-center">
                <img
                  src="/images/logo.png"
                  alt="Flashpoint Archive"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <h1 className="text-3xl font-bold text-foreground text-center tracking-tight">
                  Initial Setup
                </h1>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Create your administrator account
              </p>
            </div>

            {/* Info Alert */}
            <Alert className="mb-6 animate-fade-in-up border-primary/50 bg-muted/50">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                This account will have full administrative privileges, including user management,
                system settings, and content moderation.
              </AlertDescription>
            </Alert>

            {registerMutation.isError && (
              <Alert variant="destructive" className="mb-6 animate-slide-in-down">
                <AlertDescription>
                  {getErrorMessage(registerMutation.error) || 'Setup failed. Please try again.'}
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
                          placeholder="admin"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          autoComplete="email"
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
                      <FormLabel className="text-sm font-semibold">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a strong password (min 6 characters)"
                          autoComplete="new-password"
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
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          className="h-10 transition-all duration-200 focus:scale-[1.01] focus:ring-1 focus:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-10 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Create Admin Account
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Security Notice */}
            <div className="relative mt-4 pt-4 border-t border-border/50">
              <p className="text-center text-xs text-muted-foreground">
                🔒 Password is encrypted. Remember your credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
