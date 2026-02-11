import { Router } from 'express';
import { UserService } from '../services/UserService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';

const router = Router();
const userService = new UserService();

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  roleId: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6).max(128),
});

const updateThemeSchema = z.object({
  themeColor: z.string().min(1),
  surfaceColor: z.string().min(1).optional(),
});

const updateThemeSettingsSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  primaryColor: z.string().min(1),
});

const updateUserSettingsSchema = z.record(z.string().max(50), z.string().max(500));

router.get(
  '/',
  authenticate,
  requirePermission('users.read'),
  logActivity('users.list', 'users'),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    const result = await userService.getUsers(page, limit);

    res.json(result);
  })
);

/** @deprecated Use GET /api/users/me/settings/theme instead */
router.get(
  '/me/theme',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const themeSettings = await userService.getThemeSettings(userId);

    // Return in old format for compatibility
    res.json({
      themeColor: `${themeSettings.primaryColor}-500`,
      surfaceColor: 'slate-700',
    });
  })
);

/** @deprecated Use PATCH /api/users/me/settings/theme instead */
router.patch(
  '/me/theme',
  authenticate,
  logActivity('users.updateTheme', 'users'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const data = updateThemeSchema.parse(req.body);

    // Extract color name from format like 'blue-500' -> 'blue'
    const primaryColor = data.themeColor.split('-')[0];

    await userService.updateThemeSettings(userId, 'dark', primaryColor);

    res.json({
      success: true,
      themeColor: data.themeColor,
      surfaceColor: data.surfaceColor ?? 'slate-700',
    });
  })
);

/** @deprecated Use GET /api/users/me/settings and extract theme_mode + primary_color */
router.get(
  '/me/settings/theme',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const themeSettings = await userService.getThemeSettings(userId);
    res.json(themeSettings);
  })
);

/** @deprecated Use PATCH /api/users/me/settings with theme_mode + primary_color keys */
router.patch(
  '/me/settings/theme',
  authenticate,
  logActivity('users.updateThemeSettings', 'users'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const validated = updateThemeSettingsSchema.parse(req.body);

    await userService.updateThemeSettings(userId, validated.mode, validated.primaryColor);

    const updated = await userService.getThemeSettings(userId);
    res.json(updated);
  })
);

router.get(
  '/me/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const settings = await userService.getUserSettings(userId);
    res.json(settings);
  })
);

router.patch(
  '/me/settings',
  authenticate,
  logActivity('users.updateSettings', 'users'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const settings = updateUserSettingsSchema.parse(req.body);

    for (const [key, value] of Object.entries(settings)) {
      await userService.setUserSetting(userId, key, value);
    }

    const updated = await userService.getUserSettings(userId);
    res.json(updated);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('users.read'),
  logActivity('users.view', 'users'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const user = await userService.getUserById(id);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json(user);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('users.create'),
  logActivity('users.create', 'users'),
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);

    const user = await userService.createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      roleId: data.roleId,
      isActive: data.isActive ?? true,
    });

    res.status(201).json(user);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('users.update'),
  logActivity('users.update.profile', 'users', (req) => ({
    userId: req.params.id,
    fieldsUpdated: Object.keys(req.body),
  })),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const data = updateUserSchema.parse(req.body);

    const user = await userService.updateUser(id, data);

    res.json(user);
  })
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('users.delete'),
  logActivity('users.delete', 'users'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    if (req.user?.id === id) {
      throw new AppError(400, 'Cannot delete your own account');
    }

    await userService.deleteUser(id);

    res.json({ success: true, message: 'User deleted successfully' });
  })
);

router.post(
  '/:id/change-password',
  authenticate,
  logActivity('users.changePassword', 'users', (req) => ({
    userId: req.params.id,
    isSelfChange: req.user?.id === parseInt(req.params.id, 10),
  })),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const data = changePasswordSchema.parse(req.body);

    const isOwnPassword = req.user!.id === id;
    const userPermissions = req.user!.permissions || [];
    const hasAdminPermission = userPermissions.includes('users.update');

    // Authorization: Either changing own password OR has users.update permission
    if (!isOwnPassword && !hasAdminPermission) {
      throw new AppError(403, 'Insufficient permissions');
    }

    const isAdminReset = hasAdminPermission && !isOwnPassword;

    // Require current password for self-change (non-admin reset)
    if (!isAdminReset && !data.currentPassword) {
      throw new AppError(400, 'Current password is required');
    }

    await userService.changePassword(
      id,
      data.currentPassword || '',
      data.newPassword,
      isAdminReset
    );

    res.json({ success: true, message: 'Password changed successfully' });
  })
);

export default router;
