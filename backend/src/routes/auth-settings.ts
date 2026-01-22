import { Router } from 'express';
import { AuthSettingsService } from '../services/AuthSettingsService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
const authSettingsService = new AuthSettingsService();

// Validation schema
const updateSettingsSchema = z.object({
  guestAccessEnabled: z.boolean().optional(),
  userRegistrationEnabled: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
  maxLoginAttempts: z.number().int().positive().optional(),
  lockoutDurationMinutes: z.number().int().positive().optional()
});

/**
 * GET /api/settings/auth
 * Get current auth settings (public endpoint)
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = authSettingsService.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/settings/auth
 * Update auth settings (admin only)
 */
router.patch(
  '/',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'system_settings'),
  async (req, res, next) => {
    try {
      const data = updateSettingsSchema.parse(req.body);

      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const settings = authSettingsService.updateSettings(data, req.user.id);

      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

export default router;
