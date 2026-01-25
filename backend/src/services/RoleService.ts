import { UserDatabaseService } from './UserDatabaseService';
import { PermissionCache } from './PermissionCache';
import { AppError } from '../middleware/errorHandler';
import { Role, Permission } from '../types/auth';
import { SYSTEM_ROLES, isSystemRole } from '../constants/roles';
import { logger } from '../utils/logger';

export class RoleService {
  /**
   * Get all roles with permissions
   */
  async getRoles(): Promise<Role[]> {
    const roles = UserDatabaseService.all(
      `SELECT id, name, description, priority, created_at as createdAt, updated_at as updatedAt
       FROM roles
       ORDER BY priority DESC, name ASC`,
      []
    );

    // Get permissions for each role
    return roles.map(role => ({
      ...role,
      permissions: this.getRolePermissions(role.id)
    }));
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: number): Promise<Role | null> {
    const role = UserDatabaseService.get(
      `SELECT id, name, description, priority, created_at as createdAt, updated_at as updatedAt
       FROM roles WHERE id = ?`,
      [id]
    );

    if (!role) return null;

    return {
      ...role,
      permissions: this.getRolePermissions(id)
    };
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return UserDatabaseService.all(
      `SELECT id, name, description, resource, action FROM permissions ORDER BY resource, action`,
      []
    );
  }

  /**
   * Get permissions for a role
   */
  private getRolePermissions(roleId: number): Permission[] {
    return UserDatabaseService.all(
      `SELECT p.id, p.name, p.description, p.resource, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.resource, p.action`,
      [roleId]
    );
  }

  /**
   * Create new role
   */
  async createRole(
    name: string,
    description?: string,
    priority: number = 0,
    permissionIds: number[] = []
  ): Promise<Role> {
    // Check if role name exists
    const existing = UserDatabaseService.get('SELECT id FROM roles WHERE name = ?', [name]);
    if (existing) {
      throw new AppError(409, 'Role name already exists');
    }

    // Create role
    const result = UserDatabaseService.run(
      'INSERT INTO roles (name, description, priority) VALUES (?, ?, ?)',
      [name, description, priority]
    );

    const roleId = result.lastInsertRowid as number;

    // Assign permissions
    if (permissionIds.length > 0) {
      await this.updateRolePermissions(roleId, permissionIds);
    }

    return (await this.getRoleById(roleId))!;
  }

  /**
   * Update role
   */
  async updateRole(id: number, name?: string, description?: string, priority?: number): Promise<Role> {
    const role = await this.getRoleById(id);
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    // Prevent updating system roles (admin, user, guest)
    if (isSystemRole(id)) {
      throw new AppError(403, 'Cannot modify system roles');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      const existing = UserDatabaseService.get(
        'SELECT id FROM roles WHERE name = ? AND id != ?',
        [name, id]
      );
      if (existing) {
        throw new AppError(409, 'Role name already exists');
      }
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (updates.length === 0) {
      return role;
    }

    updates.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(id);

    UserDatabaseService.run(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return (await this.getRoleById(id))!;
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    // Prevent updating system roles (admin, user, guest)
    if (isSystemRole(roleId)) {
      throw new AppError(403, 'Cannot modify system role permissions');
    }

    // Delete existing permissions
    UserDatabaseService.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    // Insert new permissions
    for (const permissionId of permissionIds) {
      UserDatabaseService.run(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permissionId]
      );
    }

    // Invalidate permission cache for this role
    PermissionCache.invalidateRole(roleId);
    logger.info(`[RoleService] Updated permissions for role ${roleId}, cache invalidated`);

    // Note: User-specific caches will expire naturally within 5 minutes
    // For immediate updates, we could query all users with this role and invalidate them
    // but that would defeat the purpose of caching. The TTL handles eventual consistency.
  }

  /**
   * Delete role
   */
  async deleteRole(id: number): Promise<void> {
    const role = await this.getRoleById(id);
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    // Prevent deleting system roles
    if (isSystemRole(id)) {
      throw new AppError(403, 'Cannot delete system roles');
    }

    // Check if role is assigned to users
    const userCount = UserDatabaseService.get(
      'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
      [id]
    )?.count || 0;

    if (userCount > 0) {
      throw new AppError(409, `Cannot delete role: ${userCount} users are assigned to this role`);
    }

    UserDatabaseService.run('DELETE FROM roles WHERE id = ?', [id]);
  }
}
