import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { useRoles, useDeleteRole } from '../../hooks/useRoles';
import { Role } from '../../types/auth';
import { RoleGuard } from '../common/RoleGuard';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface RoleTableProps {
  onEdit: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
}

export function RoleTable({ onEdit, onManagePermissions }: RoleTableProps) {
  const { data: roles, isLoading, isError, error } = useRoles();
  const deleteRoleMutation = useDeleteRole();

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    try {
      await deleteRoleMutation.mutateAsync(role.id);
    } catch (error) {
      alert('Failed to delete role');
    }
  };

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        const variant =
          name === 'admin'
            ? 'default'
            : name === 'user'
            ? 'secondary'
            : name === 'guest'
            ? 'outline'
            : 'secondary';
        return (
          <Badge variant={variant} className="capitalize">
            {name}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="text-muted-foreground">{row.getValue('description')}</div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <div className="text-muted-foreground">{row.getValue('priority')}</div>
      ),
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => {
        const permissions = row.getValue('permissions') as string[];
        return (
          <div className="text-muted-foreground">
            {permissions.length} permissions
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const role = row.original;
        const isSystemRole = role.id <= 3;

        return (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <RoleGuard permission="roles.update">
                  <DropdownMenuItem
                    onClick={() => onEdit(role)}
                    disabled={isSystemRole}
                  >
                    Edit Role
                  </DropdownMenuItem>
                </RoleGuard>
                <RoleGuard permission="roles.update">
                  <DropdownMenuItem onClick={() => onManagePermissions(role)}>
                    Manage Permissions
                  </DropdownMenuItem>
                </RoleGuard>
                <RoleGuard permission="roles.delete">
                  <DropdownMenuItem
                    onClick={() => handleDelete(role)}
                    disabled={deleteRoleMutation.isPending || isSystemRole}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Role
                  </DropdownMenuItem>
                </RoleGuard>
              </DropdownMenuContent>
            </DropdownMenu>
            {isSystemRole && (
              <span className="text-xs text-muted-foreground">(System)</span>
            )}
          </div>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
        Error loading roles:{' '}
        {(error as any)?.response?.data?.error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={roles || []}
      isLoading={isLoading}
      emptyMessage="No roles found"
    />
  );
}
