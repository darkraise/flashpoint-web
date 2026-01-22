import { useEffect, useState } from "react";
import { usePermissions, useUpdateRolePermissions } from "../../hooks/useRoles";
import { Role } from "../../types/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface PermissionSelectorProps {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

export function PermissionSelector({
  role,
  onClose,
  onSuccess,
}: PermissionSelectorProps) {
  const { data: permissions } = usePermissions();
  const updatePermissionsMutation = useUpdateRolePermissions();

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    [],
  );

  useEffect(() => {
    if (role) {
      setSelectedPermissionIds(role.permissions.map((p) => p.id));
    }
  }, [role]);

  const handleToggle = (permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
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
        permissionIds: selectedPermissionIds,
      });
      onSuccess();
      onClose();
    } catch (error) {
      // Error is already logged in the hook
    }
  };

  // Group permissions by resource
  const groupedPermissions =
    permissions?.reduce(
      (acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      },
      {} as Record<string, typeof permissions>,
    ) || {};

  return (
    <Dialog open={true} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {role.name}</DialogTitle>
          <DialogDescription>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleSelectAll}
                className="h-auto p-0"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleDeselectAll}
                className="h-auto p-0"
              >
                Deselect All
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {!permissions && (
            <div className="text-center py-8 text-muted-foreground">
              Loading permissions...
            </div>
          )}

          {updatePermissionsMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {(updatePermissionsMutation.error as any)?.response?.data?.error
                  ?.message || "Failed to update permissions"}
              </AlertDescription>
            </Alert>
          )}

          {permissions && (
            <>
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <div
                    key={resource}
                    className="bg-card border border-border rounded-lg p-4 shadow-sm"
                  >
                    <h4 className="text-sm font-semibold text-foreground uppercase mb-3">
                      {resource}
                    </h4>
                    <div className="space-y-2">
                      {perms.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start space-x-3 cursor-pointer hover:bg-accent p-2 rounded"
                        >
                          <Checkbox
                            checked={selectedPermissionIds.includes(
                              permission.id,
                            )}
                            onCheckedChange={() => handleToggle(permission.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {permission.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogBody>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 items-center">
          <div className="text-sm text-muted-foreground">
            {selectedPermissionIds.length} of {permissions?.length ?? 0}{" "}
            permissions selected
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={updatePermissionsMutation.isPending || !permissions}
            >
              {updatePermissionsMutation.isPending
                ? "Saving..."
                : "Save Permissions"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
