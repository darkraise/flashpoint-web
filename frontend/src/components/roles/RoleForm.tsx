import { useEffect } from 'react';
import { useCreateRole, useUpdateRole, usePermissions } from '@/hooks/useRoles';
import { Role, CreateRoleData, UpdateRoleData } from '@/types/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/types/api-error';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

const roleSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormProps {
  role?: Role | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleForm({ role, onClose, onSuccess }: RoleFormProps) {
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const { data: permissions } = usePermissions();

  const isEditMode = !!role;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissionIds: role?.permissions?.map((p) => p.id) ?? [],
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description,
        permissionIds: role.permissions?.map((p) => p.id) || [],
      });
    }
  }, [role, form]);

  const onSubmit = async (values: RoleFormValues) => {
    try {
      if (isEditMode) {
        const updateData: UpdateRoleData = {
          name: values.name,
          description: values.description,
        };
        await updateMutation.mutateAsync({ id: role.id, data: updateData });
      } else {
        const createData: CreateRoleData = {
          name: values.name,
          description: values.description,
          permissionIds: values.permissionIds || [],
        };
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
    <Dialog open={true} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {mutation.isError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {getErrorMessage(mutation.error) || 'Operation failed'}
              </AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. moderator" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose of this role"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEditMode && permissions && permissions.length > 0 ? (
                <FormField
                  control={form.control}
                  name="permissionIds"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Permissions</FormLabel>
                        <FormDescription>
                          Select the permissions this role should have
                        </FormDescription>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                        {permissions.map((permission) => (
                          <FormField
                            key={permission.id}
                            control={form.control}
                            name="permissionIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={permission.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permission.id)}
                                      onCheckedChange={(checked: boolean) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), permission.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== permission.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {permission.name}
                                    </FormLabel>
                                    {permission.description ? (
                                      <FormDescription className="text-xs">
                                        {permission.description}
                                      </FormDescription>
                                    ) : null}
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {isEditMode ? (
                <Alert className="border-blue-500 bg-blue-500/10 text-blue-400">
                  <AlertDescription>
                    Permissions can be managed separately from role details. Use the permissions
                    management page to update role permissions.
                  </AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
