import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService';

const activityService = new ActivityService();

/**
 * Log activity middleware
 * Logs user activity after request completes
 *
 * @param action - The action being performed (e.g., 'games.view', 'auth.login')
 * @param resource - Optional resource type (e.g., 'games', 'users')
 * @param detailsExtractor - Optional function to extract additional details from request/response
 */
export const logActivity = (
  action: string,
  resource?: string,
  detailsExtractor?: (req: Request, res: Response) => Record<string, any>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end;

    // Override end function to log activity after response
    res.end = function(this: Response, ...args: any[]): Response {
      // Log activity (non-blocking)
      setImmediate(async () => {
        try {
          const resourceId = req.params.id || req.body?.id;

          // Extract additional details if extractor provided
          const details = detailsExtractor ? detailsExtractor(req, res) : undefined;

          await activityService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action,
            resource,
            resourceId,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (error) {
          // Log error but don't fail request
          console.error('Failed to log activity:', error);
        }
      });

      // Call original end function
      return originalEnd.apply(this, args as any);
    };

    next();
  };
};
