import { useState } from 'react';
import { UserTable } from '../components/users/UserTable';
import { UserForm } from '../components/users/UserForm';
import { ChangePasswordDialog } from '../components/users/ChangePasswordDialog';
import { UserDetails } from '../types/auth';
import { RoleGuard } from '../components/common/RoleGuard';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export function UsersView() {
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetails | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<UserDetails | null>(null);

  const handleEdit = (user: UserDetails) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleChangePassword = (user: UserDetails) => {
    setChangingPasswordUser(user);
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleSuccess = () => {
    // Query will automatically refetch due to invalidation in hooks
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Users size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>
        <RoleGuard permission="users.create">
          <Button onClick={() => setShowUserForm(true)}>
            Create User
          </Button>
        </RoleGuard>
      </div>

      <UserTable onEdit={handleEdit} onChangePassword={handleChangePassword} />

      {showUserForm && (
        <UserForm
          user={editingUser}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}

      {changingPasswordUser && (
        <ChangePasswordDialog
          isOpen={!!changingPasswordUser}
          user={changingPasswordUser}
          onClose={() => setChangingPasswordUser(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
