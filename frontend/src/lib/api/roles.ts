import { apiClient } from './client';
import type { Role, CreateRoleData, UpdateRoleData, Permission, PaginatedResponse } from '@/types/auth';

export const rolesApi = {
  getAll: async (page: number = 1, limit: number = 20): Promise<PaginatedResponse<Role>> => {
    const { data } = await apiClient.get<PaginatedResponse<Role>>('/roles', {
      params: { page, limit },
    });
    return data;
  },

  getById: async (id: number): Promise<Role> => {
    const { data } = await apiClient.get<Role>(`/roles/${id}`);
    return data;
  },

  getPermissions: async (): Promise<Permission[]> => {
    const { data } = await apiClient.get<Permission[]>('/roles/permissions');
    return data;
  },

  create: async (roleData: CreateRoleData): Promise<Role> => {
    const { data } = await apiClient.post<Role>('/roles', roleData);
    return data;
  },

  update: async (id: number, roleData: UpdateRoleData): Promise<Role> => {
    const { data } = await apiClient.patch<Role>(`/roles/${id}`, roleData);
    return data;
  },

  updatePermissions: async (id: number, permissionIds: number[]): Promise<Role> => {
    const { data } = await apiClient.put<Role>(`/roles/${id}/permissions`, { permissionIds });
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/roles/${id}`);
    return data;
  },
};
