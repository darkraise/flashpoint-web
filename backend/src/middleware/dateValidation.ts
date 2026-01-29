import { Request, Response, NextFunction } from 'express';

/**
 * Date Range Validation Middleware
 *
 * Validates that startDate and endDate query parameters are valid dates
 * and that endDate is not before startDate.
 *
 * @param startDateKey - Query parameter name for start date (default: 'startDate')
 * @param endDateKey - Query parameter name for end date (default: 'endDate')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.get('/activities',
 *   validateDateRange(),
 *   async (req, res) => {
 *     // Date range is validated
 *   }
 * );
 *
 * // With custom parameter names
 * router.get('/reports',
 *   validateDateRange('from', 'to'),
 *   async (req, res) => {
 *     // Date range is validated using 'from' and 'to' params
 *   }
 * );
 * ```
 */
export function validateDateRange(
  startDateKey: string = 'startDate',
  endDateKey: string = 'endDate'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startDate = req.query[startDateKey] as string | undefined;
    const endDate = req.query[endDateKey] as string | undefined;

    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }

      if (endDateObj < startDateObj) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after or equal to start date'
        });
      }
    }

    next();
  };
}
