import { Router } from 'express';
import { AuthSettingsService } from '../services/AuthSettingsService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';

const router = Router();
const authSettingsService = new AuthSettingsService();

const updateSettingsSchema = z.object({
  guestAccessEnabled: z.boolean().optional(),
  userRegistrationEnabled: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
  maxLoginAttempts: z.number().int().positive().optional(),
  lockoutDurationMinutes: z.number().int().positive().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = authSettingsService.getSettings();
    res.json(settings);
  })
);

router.patch(
  '/',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'system_settings'),
  asyncHandler(async (req, res) => {
    try {
      const data = updateSettingsSchema.parse(req.body);

      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const settings = authSettingsService.updateSettings(data, req.user.id);

      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, `Validation error: ${error.errors[0].message}`);
      }
      throw error;
    }
  })
);

export default router;
