import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { useAuth } from '../../contexts/AuthContext';
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

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const { loginAsGuest } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(values);
      // Redirect to the page they tried to visit or home
      navigate(from, { replace: true });
    } catch (error) {
      // Error is already logged in the hook
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>

        {loginMutation.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {(loginMutation.error as any)?.response?.data?.error?.message || 'Login failed. Please check your credentials.'}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Username"
                      autoFocus
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="******************"
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
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={loginAsGuest}
              >
                Browse as Guest
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-4 text-center">
          <Link to="/register" className="text-sm text-blue-400 hover:text-blue-300">
            Don't have an account? Register
          </Link>
        </div>
      </div>
    </div>
  );
}
