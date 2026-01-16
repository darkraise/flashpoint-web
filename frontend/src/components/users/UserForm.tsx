import { useEffect } from 'react';
import { useCreateUser, useUpdateUser } from '../../hooks/useUsers';
import { useRoles } from '../../hooks/useRoles';
import { UserDetails, CreateUserData, UpdateUserData } from '../../types/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.number(),
  isActive: z.boolean(),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.number(),
  isActive: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

interface UserFormProps {
  user?: UserDetails | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { data: roles } = useRoles();

  const isEditMode = !!user;

  const form = useForm<CreateUserFormValues | UpdateUserFormValues>({
    resolver: zodResolver(isEditMode ? updateUserSchema : createUserSchema),
    defaultValues: isEditMode
      ? {
          email: user.email,
          roleId: user.roleId,
          isActive: user.isActive,
        }
      : {
          username: '',
          email: '',
          password: '',
          roleId: 2, // Default to 'user' role
          isActive: true,
        },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        roleId: user.roleId,
        isActive: user.isActive,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: CreateUserFormValues | UpdateUserFormValues) => {
    try {
      if (isEditMode) {
        const updateData: UpdateUserData = values as UpdateUserFormValues;
        await updateMutation.mutateAsync({ id: user.id, userData: updateData });
      } else {
        const createData: CreateUserData = values as CreateUserFormValues;
        await createMutation.mutateAsync(createData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      // Error is already logged in the hook
    }
  };

  const mutation = isEditMode ? updateMutation : createMutation;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-white">
            {isEditMode ? 'Edit User' : 'Create New User'}
          </h3>
        </div>

        <div className="px-6 py-4">
          {mutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {(mutation.error as any)?.response?.data?.error?.message || 'Operation failed'}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isEditMode && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isEditMode && user && (
                <div>
                  <FormLabel>Username</FormLabel>
                  <Input
                    value={user.username}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEditMode && (
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
              )}

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value: string) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name} - {role.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        User can sign in and access the application
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
