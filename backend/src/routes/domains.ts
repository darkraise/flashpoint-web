import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DomainService } from '../services/DomainService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { logger } from '../utils/logger';

const router = Router();

// ===================================
// GET ALL DOMAINS
// ===================================
router.get(
  '/',
  authenticate,
  requirePermission('settings.read'),
  async (req: Request, res: Response) => {
    try {
      const domainService = new DomainService();
      const domains = domainService.getAllDomains();
      res.json(domains);
    } catch (error) {
      logger.error('Failed to get domains:', error);
      res.status(500).json({
        error: { message: 'Failed to retrieve domains' },
      });
    }
  }
);

// ===================================
// ADD DOMAIN
// ===================================
const addDomainSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required'),
});

router.post(
  '/',
  authenticate,
  requirePermission('settings.update'),
  logActivity('domains.add', 'domains'),
  async (req: Request, res: Response) => {
    try {
      const validation = addDomainSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const domainService = new DomainService();
      const domain = domainService.addDomain(validation.data.hostname, req.user!.id);
      res.status(201).json(domain);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('must not') || error.message.includes('Invalid') || error.message.includes('cannot be empty'))) {
        return res.status(400).json({
          error: { message: error.message },
        });
      }
      logger.error('Failed to add domain:', error);
      res.status(500).json({
        error: { message: 'Failed to add domain' },
      });
    }
  }
);

// ===================================
// DELETE DOMAIN
// ===================================
router.delete(
  '/:id',
  authenticate,
  requirePermission('settings.update'),
  logActivity('domains.delete', 'domains'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: { message: 'Invalid domain ID' },
        });
      }

      const domainService = new DomainService();
      const deleted = domainService.deleteDomain(id);

      if (!deleted) {
        return res.status(404).json({
          error: { message: 'Domain not found' },
        });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete domain:', error);
      res.status(500).json({
        error: { message: 'Failed to delete domain' },
      });
    }
  }
);

// ===================================
// SET DEFAULT DOMAIN
// ===================================
router.patch(
  '/:id/default',
  authenticate,
  requirePermission('settings.update'),
  logActivity('domains.setDefault', 'domains'),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          error: { message: 'Invalid domain ID' },
        });
      }

      const domainService = new DomainService();
      const domain = domainService.setDefault(id);

      if (!domain) {
        return res.status(404).json({
          error: { message: 'Domain not found' },
        });
      }

      res.json(domain);
    } catch (error) {
      logger.error('Failed to set default domain:', error);
      res.status(500).json({
        error: { message: 'Failed to set default domain' },
      });
    }
  }
);

export default router;
