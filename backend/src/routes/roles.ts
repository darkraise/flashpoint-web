import { Router } from 'express';
import { RoleService } from '../services/RoleService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
const roleService = new RoleService();

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().optional(),
  priority: z.number().int().default(0),
  permissionIds: z.array(z.number().int().positive()).optional()
});

const updateRoleSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().optional(),
  priority: z.number().int().optional()
});

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive())
});

/**
 * GET /api/roles
 * List all roles with their permissions
 */
router.get(
  '/',
  authenticate,
  requirePermission('roles.read'),
  logActivity('roles.list', 'roles'),
  async (req, res, next) => {
    try {
      const roles = await roleService.getRoles();
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/roles/permissions
 * List all available permissions
 */
router.get(
  '/permissions',
  authenticate,
  requirePermission('roles.read'),
  async (req, res, next) => {
    try {
      const permissions = roleService.getPermissions();
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/roles/:id
 * Get single role by ID with permissions
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('roles.read'),
  logActivity('roles.view', 'roles'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const role = await roleService.getRoleById(id);

      if (!role) {
        throw new AppError(404, 'Role not found');
      }

      res.json(role);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/roles
 * Create new role with permissions
 */
router.post(
  '/',
  authenticate,
  requirePermission('roles.create'),
  logActivity('roles.create', 'roles'),
  async (req, res, next) => {
    try {
      const data = createRoleSchema.parse(req.body);

      const role = await roleService.createRole(
        data.name,
        data.description,
        data.priority,
        data.permissionIds || []
      );

      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/roles/:id
 * Update role metadata (name, description, priority)
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('roles.update'),
  logActivity('roles.update', 'roles'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const data = updateRoleSchema.parse(req.body);

      const role = await roleService.updateRole(
        id,
        data.name,
        data.description,
        data.priority
      );

      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * PUT /api/roles/:id/permissions
 * Update role permissions (replaces all permissions)
 */
router.put(
  '/:id/permissions',
  authenticate,
  requirePermission('roles.update'),
  logActivity('roles.update_permissions', 'roles'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const data = updatePermissionsSchema.parse(req.body);

      const role = await roleService.updateRolePermissions(id, data.permissionIds);

      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/roles/:id
 * Delete role (prevents deleting system roles)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('roles.delete'),
  logActivity('roles.delete', 'roles'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);

      await roleService.deleteRole(id);

      res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
