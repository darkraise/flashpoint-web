import { Router } from 'express';
import { z } from 'zod';
import { DomainService } from '../services/DomainService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const domainService = DomainService.getInstance();

router.get(
  '/',
  authenticate,
  requirePermission('settings.read'),
  asyncHandler(async (_req, res) => {
    const domains = domainService.getAllDomains();
    res.json(domains);
  })
);

const hostnameSchema = z
  .string()
  .trim()
  .min(1, 'Hostname is required')
  .max(253, 'Hostname must not exceed 253 characters')
  .superRefine((val, ctx) => {
    // Reject protocol prefixes
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hostname must not include a protocol (e.g., http:// or https://)',
      });
      return;
    }

    // Reject whitespace anywhere
    if (/\s/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hostname must not contain whitespace',
      });
      return;
    }

    // Reject wildcards
    if (val.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hostname must not contain wildcards',
      });
      return;
    }

    // Reject paths, query strings, fragments
    if (/[/?#]/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hostname must not include a path, query string, or fragment',
      });
      return;
    }

    // Reject userinfo (user:pass@host)
    if (val.includes('@')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hostname must not include userinfo (user@host)',
      });
      return;
    }

    // Split host and optional port
    const portMatch = val.match(/^(.+):(\d+)$/);
    const host = portMatch ? portMatch[1] : val;
    const port = portMatch ? parseInt(portMatch[2], 10) : null;

    // Validate port range
    if (port !== null && (port < 1 || port > 65535)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Port must be between 1 and 65535',
      });
      return;
    }

    // Validate hostname: alphanumeric labels separated by dots, hyphens allowed (not at start/end of label)
    const labels = host.split('.');
    const labelPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

    for (const label of labels) {
      if (!label) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hostname must not contain empty labels (consecutive dots)',
        });
        return;
      }
      if (label.length > 63) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each hostname label must not exceed 63 characters',
        });
        return;
      }
      if (!labelPattern.test(label)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Hostname labels must contain only letters, digits, and hyphens, and must not start or end with a hyphen',
        });
        return;
      }
    }
  });

const addDomainSchema = z.object({
  hostname: hostnameSchema,
});

router.post(
  '/',
  authenticate,
  requirePermission('settings.update'),
  logActivity('domains.add', 'domains'),
  asyncHandler(async (req, res) => {
    try {
      const data = addDomainSchema.parse(req.body);
      const domain = domainService.addDomain(data.hostname, req.user!.id);
      res.status(201).json(domain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, `Validation error: ${error.errors[0].message}`);
      }
      throw error;
    }
  })
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('settings.update'),
  logActivity('domains.delete', 'domains'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid domain ID');
    }

    domainService.deleteDomain(id);
    res.json({ success: true });
  })
);

router.patch(
  '/:id/default',
  authenticate,
  requirePermission('settings.update'),
  logActivity('domains.setDefault', 'domains'),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid domain ID');
    }

    const domain = domainService.setDefault(id);
    res.json(domain);
  })
);

export default router;
