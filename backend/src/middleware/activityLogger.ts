import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService';
import { logger } from '../utils/logger';

const activityService = new ActivityService();

/** Logs user activity after request completes (non-blocking). */
export const logActivity = (
  action: string,
  resource?: string,
  detailsExtractor?: (req: Request, res: Response) => Record<string, unknown>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalEnd = res.end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function (this: Response, ...args: unknown[]): Response {
      setImmediate(async () => {
        try {
          const resourceId = req.params.id || req.body?.id;
          const details = detailsExtractor ? detailsExtractor(req, res) : undefined;

          await activityService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action,
            resource,
            resourceId,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        } catch (error) {
          logger.error('Failed to log activity:', error);
        }
      });

      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    };

    next();
  };
};
