import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useRoles, useDeleteRole } from '@/hooks/useRoles';
import { Role } from '@/types/auth';
import { RoleGuard } from '../common/RoleGuard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getErrorMessage } from '@/types/api-error';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/** System role IDs from the initial migration — admin=1, user=2, guest=3 */
const SYSTEM_ROLE_IDS = new Set([1, 2, 3]);

interface RoleTableProps {
  onEdit: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
}

export function RoleTable({ onEdit, onManagePermissions }: RoleTableProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const { data: roles, isLoading, isError, error } = useRoles();
  const deleteRoleMutation = useDeleteRole();

  // Sort roles: system roles (admin=1, user=2, guest=3) pinned at top, then others by name
  const sortedRoles = useMemo(() => {
    if (!roles) return [];
    return [...roles].sort((a, b) => {
      const aIsSystem = SYSTEM_ROLE_IDS.has(a.id);
      const bIsSystem = SYSTEM_ROLE_IDS.has(b.id);

      // System roles come first
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;

      // Among system roles, sort by ID (admin=1, user=2, guest=3)
      if (aIsSystem && bIsSystem) return a.id - b.id;

      // Among custom roles, sort by name
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await deleteRoleMutation.mutateAsync(roleToDelete.id);
      toast.success(`Role "${roleToDelete.name}" deleted successfully`);
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      toast.error('Failed to delete role');
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setRoleToDelete(null);
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
      cell: ({ row }) => <div className="text-muted-foreground">{row.getValue('description')}</div>,
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => {
        const permissions = row.getValue('permissions') as string[];
        return <div className="text-muted-foreground">{permissions.length} permissions</div>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const role = row.original;
        const isSystemRole = SYSTEM_ROLE_IDS.has(role.id);

        // System roles cannot be modified - show label instead of menu
        if (isSystemRole) {
          return (
            <Badge variant="outline" className="text-muted-foreground">
              System Role
            </Badge>
          );
        }

        return (
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
                <DropdownMenuItem onClick={() => onEdit(role)}>Edit Role</DropdownMenuItem>
              </RoleGuard>
              <RoleGuard permission="roles.update">
                <DropdownMenuItem onClick={() => onManagePermissions(role)}>
                  Manage Permissions
                </DropdownMenuItem>
              </RoleGuard>
              <RoleGuard permission="roles.delete">
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(role)}
                  disabled={deleteRoleMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Role
                </DropdownMenuItem>
              </RoleGuard>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
        Error loading roles: {getErrorMessage(error) || 'Unknown error'}
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={sortedRoles}
        isLoading={isLoading}
        emptyMessage="No roles found"
      />
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Role"
        message={`Are you sure you want to delete role "${roleToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
