import { Router } from 'express';
import { RuffleService } from '../services/RuffleService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const ruffleService = new RuffleService();

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

router.get(
  '/check-update',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const updateInfo = await ruffleService.checkForUpdate();
    res.json(updateInfo);
  })
);

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
