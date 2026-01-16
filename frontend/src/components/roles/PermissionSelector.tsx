import { useEffect, useState } from 'react';
import { usePermissions, useUpdateRolePermissions } from '../../hooks/useRoles';
import { Role } from '../../types/auth';

interface PermissionSelectorProps {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

export function PermissionSelector({ role, onClose, onSuccess }: PermissionSelectorProps) {
  const { data: permissions } = usePermissions();
  const updatePermissionsMutation = useUpdateRolePermissions();

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  useEffect(() => {
    if (role) {
      setSelectedPermissionIds(role.permissions.map((p) => p.id));
    }
  }, [role]);

  const handleToggle = (permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAll = () => {
    if (permissions) {
      setSelectedPermissionIds(permissions.map((p) => p.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedPermissionIds([]);
  };

  const handleSubmit = async () => {
    try {
      await updatePermissionsMutation.mutateAsync({
        id: role.id,
        permissionIds: selectedPermissionIds
      });
      onSuccess();
      onClose();
    } catch (error) {
      // Error is already logged in the hook
    }
  };

  if (!permissions) {
    return <div className="text-center py-8 text-gray-400">Loading permissions...</div>;
  }

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-white">
            Manage Permissions for {role.name}
          </h3>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {updatePermissionsMutation.isError && (
            <div className="mb-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded text-sm">
              {(updatePermissionsMutation.error as any)?.response?.data?.error?.message || 'Failed to update permissions'}
            </div>
          )}

          <div className="mb-4 space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Deselect All
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource} className="bg-background-tertiary/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 uppercase mb-3">
                  {resource}
                </h4>
                <div className="space-y-2">
                  {perms.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start space-x-3 cursor-pointer hover:bg-background-elevated p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissionIds.includes(permission.id)}
                        onChange={() => handleToggle(permission.id)}
                        className="w-4 h-4 mt-0.5 text-blue-500 bg-background-tertiary border-border-light rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">
                          {permission.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {permission.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedPermissionIds.length} of {permissions.length} permissions selected
          </div>
          <div className="space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-background-tertiary text-white rounded hover:bg-background-elevated"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={updatePermissionsMutation.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
