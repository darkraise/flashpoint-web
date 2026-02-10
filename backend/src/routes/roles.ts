import { Router } from 'express';
import { RoleService } from '../services/RoleService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';

const router = Router();
const roleService = new RoleService();

const createRoleSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().optional(),
  priority: z.number().int().default(0),
  permissionIds: z.array(z.number().int().positive()).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
});

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()),
});

router.get(
  '/',
  authenticate,
  requirePermission('roles.read'),
  logActivity('roles.list', 'roles'),
  asyncHandler(async (req, res) => {
    const roles = await roleService.getRoles();
    res.json(roles);
  })
);

router.get(
  '/permissions',
  authenticate,
  requirePermission('roles.read'),
  asyncHandler(async (req, res) => {
    const permissions = await roleService.getPermissions();
    res.json(permissions);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('roles.read'),
  logActivity('roles.view', 'roles'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid role ID');
    }

    const role = await roleService.getRoleById(id);

    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    res.json(role);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('roles.create'),
  logActivity('roles.create', 'roles'),
  asyncHandler(async (req, res) => {
    const data = createRoleSchema.parse(req.body);

    if (data.permissionIds && data.permissionIds.length > 0) {
      await roleService.validatePermissionEscalation(
        data.permissionIds,
        req.user?.permissions || []
      );
    }

    const role = await roleService.createRole(
      data.name,
      data.description,
      data.priority,
      data.permissionIds || []
    );

    res.status(201).json(role);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('roles.update'),
  logActivity('roles.update', 'roles'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid role ID');
    }

    const data = updateRoleSchema.parse(req.body);

    const role = await roleService.updateRole(id, data.name, data.description, data.priority);

    res.json(role);
  })
);

router.put(
  '/:id/permissions',
  authenticate,
  requirePermission('roles.update'),
  logActivity('roles.update_permissions', 'roles'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid role ID');
    }

    const data = updatePermissionsSchema.parse(req.body);

    await roleService.validatePermissionEscalation(data.permissionIds, req.user?.permissions || []);

    await roleService.updateRolePermissions(id, data.permissionIds);
    const role = await roleService.getRoleById(id);

    res.json(role);
  })
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('roles.delete'),
  logActivity('roles.delete', 'roles'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid role ID');
    }

    await roleService.deleteRole(id);

    res.json({ success: true, message: 'Role deleted successfully' });
  })
);

export default router;
