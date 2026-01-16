import { Router } from 'express';
import { UserService } from '../services/UserService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
const userService = new UserService();

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.number().int().positive(),
  isActive: z.boolean().optional()
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

const updateThemeSchema = z.object({
  themeColor: z.string().min(1),
  surfaceColor: z.string().min(1).optional()
});

/**
 * GET /api/users
 * List all users with pagination
 */
router.get(
  '/',
  authenticate,
  requirePermission('users.read'),
  logActivity('users.list', 'users'),
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await userService.getUsers(page, limit);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('users.read'),
  logActivity('users.view', 'users'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const user = await userService.getUserById(id);

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post(
  '/',
  authenticate,
  requirePermission('users.create'),
  logActivity('users.create', 'users'),
  async (req, res, next) => {
    try {
      const data = createUserSchema.parse(req.body);

      const user = await userService.createUser({
        username: data.username,
        email: data.email,
        password: data.password,
        roleId: data.roleId,
        isActive: data.isActive ?? true
      });

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/users/:id
 * Update existing user
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('users.update'),
  logActivity('users.update', 'users'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const data = updateUserSchema.parse(req.body);

      const user = await userService.updateUser(id, data);

      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user (prevents deleting last admin)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('users.delete'),
  logActivity('users.delete', 'users'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);

      await userService.deleteUser(id);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users/:id/change-password
 * Change user password
 * Users can change their own password, admins can change any password
 */
router.post(
  '/:id/change-password',
  authenticate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const data = changePasswordSchema.parse(req.body);

      // Check if user is changing their own password or is an admin
      const isOwnPassword = req.user?.id === id;
      const isAdmin = req.user?.permissions.includes('users.update');

      if (!isOwnPassword && !isAdmin) {
        throw new AppError(403, 'Insufficient permissions');
      }

      await userService.changePassword(id, data.currentPassword, data.newPassword);

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * GET /api/users/me/theme
 * Get current user's theme preference
 */
router.get(
  '/me/theme',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const user = await userService.getUserById(userId);

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      res.json({
        themeColor: user.themeColor || 'blue-500',
        surfaceColor: user.surfaceColor || 'slate-700'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/me/theme
 * Update current user's theme preference
 */
router.patch(
  '/me/theme',
  authenticate,
  logActivity('users.updateTheme', 'users'),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const data = updateThemeSchema.parse(req.body);

      await userService.updateUserTheme(userId, data.themeColor, data.surfaceColor);

      res.json({
        success: true,
        themeColor: data.themeColor,
        surfaceColor: data.surfaceColor
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

export default router;
