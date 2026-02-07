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

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6),
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

/**
 * GET /api/users
 * List all users with pagination
 */
router.get(
  '/',
  authenticate,
  requirePermission('users.read'),
  logActivity('users.list', 'users'),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await userService.getUsers(page, limit);

    res.json(result);
  })
);

/**
 * GET /api/users/me/theme (DEPRECATED - redirects to new endpoint)
 * Legacy endpoint for backward compatibility
 * @deprecated Use GET /api/users/me/settings/theme instead
 */
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

/**
 * PATCH /api/users/me/theme (DEPRECATED - redirects to new endpoint)
 * Legacy endpoint for backward compatibility
 * @deprecated Use PATCH /api/users/me/settings/theme instead
 */
router.patch(
  '/me/theme',
  authenticate,
  logActivity('users.updateTheme', 'users'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const data = updateThemeSchema.parse(req.body);

    // Extract color name from format like 'blue-500' -> 'blue'
    const primaryColor = data.themeColor.split('-')[0];

    // Update using new settings table
    await userService.updateThemeSettings(userId, 'dark', primaryColor);

    res.json({
      success: true,
      themeColor: data.themeColor,
      surfaceColor: data.surfaceColor || 'slate-700',
    });
  })
);

/**
 * GET /api/users/me/settings/theme (DEPRECATED)
 * Get current user's theme settings from user_settings table
 * @deprecated Use GET /api/users/me/settings instead and extract theme_mode and primary_color
 */
router.get(
  '/me/settings/theme',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const themeSettings = await userService.getThemeSettings(userId);
    res.json(themeSettings);
  })
);

/**
 * PATCH /api/users/me/settings/theme (DEPRECATED)
 * Update current user's theme settings in user_settings table
 * @deprecated Use PATCH /api/users/me/settings with theme_mode and primary_color keys instead
 */
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

/**
 * GET /api/users/me/settings
 * Get all settings for current user
 */
router.get(
  '/me/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const settings = await userService.getUserSettings(userId);
    res.json(settings);
  })
);

/**
 * PATCH /api/users/me/settings
 * Update multiple settings for current user
 */
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

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('users.read'),
  logActivity('users.view', 'users'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
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

/**
 * POST /api/users
 * Create new user (admin only)
 */
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

/**
 * PATCH /api/users/:id
 * Update existing user
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('users.update'),
  logActivity('users.update.profile', 'users', (req) => ({
    userId: req.params.id,
    fieldsUpdated: Object.keys(req.body),
  })),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const data = updateUserSchema.parse(req.body);

    const user = await userService.updateUser(id, data);

    res.json(user);
  })
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
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    await userService.deleteUser(id);

    res.json({ success: true, message: 'User deleted successfully' });
  })
);

/**
 * POST /api/users/:id/change-password
 * Change user password
 * Users can change their own password, admins can change any password
 */
router.post(
  '/:id/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid user ID');
    }

    const data = changePasswordSchema.parse(req.body);

    // Check if user is changing their own password or is an admin
    const isOwnPassword = req.user?.id === id;
    const isAdmin = req.user?.permissions.includes('users.update');

    if (!isOwnPassword && !isAdmin) {
      throw new AppError(403, 'Insufficient permissions');
    }

    const isAdminReset = isAdmin && !isOwnPassword;

    // Require current password for non-admin password changes
    if (!isAdminReset && !data.currentPassword) {
      throw new AppError(400, 'Current password is required');
    }

    await userService.changePassword(id, data.currentPassword || '', data.newPassword, isAdminReset);

    res.json({ success: true, message: 'Password changed successfully' });
  })
);

export default router;
