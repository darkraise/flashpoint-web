import { Router } from 'express';
import { RuffleService } from '../services/RuffleService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const ruffleService = new RuffleService();

/**
 * GET /api/ruffle/version
 * Get current Ruffle version (public endpoint)
 */
router.get('/version', (req, res, next) => {
  try {
    const currentVersion = ruffleService.getCurrentVersion();
    const isInstalled = ruffleService.verifyInstallation();

    res.json({
      currentVersion,
      isInstalled,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ruffle/check-update
 * Check for Ruffle updates (admin only)
 */
router.get(
  '/check-update',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const updateInfo = await ruffleService.checkForUpdate();
    res.json(updateInfo);
  })
);

/**
 * POST /api/ruffle/update
 * Update Ruffle to latest version (admin only)
 */
router.post(
  '/update',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const result = await ruffleService.updateRuffle();
    res.json(result);
  })
);

export default router;
