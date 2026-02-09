import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { useUsers, useDeleteUser } from '../../hooks/useUsers';
import { UserDetails } from '../../types/auth';
import { RoleGuard } from '../common/RoleGuard';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { FormattedDate } from '../common/FormattedDate';
import { getErrorMessage } from '@/types/api-error';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface UserTableProps {
  onEdit: (user: UserDetails) => void;
  onChangePassword: (user: UserDetails) => void;
}

export function UserTable({ onEdit, onChangePassword }: UserTableProps) {
  const [page, setPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserDetails | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error } = useUsers(page, limit);
  const deleteUserMutation = useDeleteUser();

  const handleDeleteClick = (user: UserDetails) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
    } catch {
      // Hook handles error toast
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const columns: ColumnDef<UserDetails>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => <div className="font-medium">{row.getValue('username')}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <div className="text-muted-foreground">{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'roleName',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('roleName') as string;
        const variant = role === 'admin' ? 'default' : role === 'user' ? 'secondary' : 'outline';
        return (
          <Badge variant={variant} className="capitalize">
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean;
        return (
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ row }) => {
        const lastLogin = row.getValue('lastLoginAt') as string | null;
        return (
          <div className="text-muted-foreground">
            {lastLogin ? <FormattedDate date={lastLogin} type="datetime" /> : 'Never'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;

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
              <RoleGuard permission="users.update">
                <DropdownMenuItem onClick={() => onEdit(user)}>Edit User</DropdownMenuItem>
              </RoleGuard>
              <RoleGuard permission="users.update">
                <DropdownMenuItem onClick={() => onChangePassword(user)}>
                  Change Password
                </DropdownMenuItem>
              </RoleGuard>
              <RoleGuard permission="users.delete">
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(user)}
                  disabled={deleteUserMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  Delete User
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
        Error loading users: {getErrorMessage(error) || 'Unknown error'}
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No users found"
      />
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
