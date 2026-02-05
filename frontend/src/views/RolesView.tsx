import { useState } from 'react';
import { RoleTable } from '../components/roles/RoleTable';
import { RoleForm } from '../components/roles/RoleForm';
import { PermissionSelector } from '../components/roles/PermissionSelector';
import { Role } from '../types/auth';
import { RoleGuard } from '../components/common/RoleGuard';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export function RolesView() {
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [managingPermissionsRole, setManagingPermissionsRole] = useState<Role | null>(null);

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setShowRoleForm(true);
  };

  const handleManagePermissions = (role: Role) => {
    setManagingPermissionsRole(role);
  };

  const handleCloseForm = () => {
    setShowRoleForm(false);
    setEditingRole(null);
  };

  const handleSuccess = () => {
    // Query will automatically refetch due to invalidation in hooks
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Shield size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">Role & Permission Management</h1>
        </div>
        <RoleGuard permission="roles.create">
          <Button onClick={() => setShowRoleForm(true)}>Create Role</Button>
        </RoleGuard>
      </div>

      <RoleTable onEdit={handleEdit} onManagePermissions={handleManagePermissions} />

      {showRoleForm ? (
        <RoleForm role={editingRole} onClose={handleCloseForm} onSuccess={handleSuccess} />
      ) : null}

      {managingPermissionsRole ? (
        <PermissionSelector
          role={managingPermissionsRole}
          onClose={() => setManagingPermissionsRole(null)}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
