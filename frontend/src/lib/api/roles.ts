import { apiClient } from './client';
import type { Role, CreateRoleData, UpdateRoleData, Permission } from '@/types/auth';

/**
 * Roles API
 *
 * Manages user roles and permissions (RBAC)
 */
export const rolesApi = {
  /**
   * Get all roles
   */
  getAll: async (): Promise<Role[]> => {
    const { data } = await apiClient.get<Role[]>('/roles');
    return data;
  },

  /**
   * Get role by ID
   */
  getById: async (id: number): Promise<Role> => {
    const { data } = await apiClient.get<Role>(`/roles/${id}`);
    return data;
  },

  /**
   * Get all available permissions
   */
  getPermissions: async (): Promise<Permission[]> => {
    const { data } = await apiClient.get<Permission[]>('/roles/permissions');
    return data;
  },

  /**
   * Create a new role
   */
  create: async (roleData: CreateRoleData): Promise<Role> => {
    const { data } = await apiClient.post<Role>('/roles', roleData);
    return data;
  },

  /**
   * Update role information
   */
  update: async (id: number, roleData: UpdateRoleData): Promise<Role> => {
    const { data } = await apiClient.patch<Role>(`/roles/${id}`, roleData);
    return data;
  },

  /**
   * Update role permissions
   */
  updatePermissions: async (id: number, permissionIds: number[]): Promise<Role> => {
    const { data } = await apiClient.put<Role>(`/roles/${id}/permissions`, { permissionIds });
    return data;
  },

  /**
   * Delete a role
   */
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/roles/${id}`);
    return data;
  },
};
