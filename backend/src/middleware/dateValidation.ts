import { Request, Response, NextFunction } from 'express';

/** Validates that startDate/endDate query params are valid dates and that endDate >= startDate. */
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
          error: 'Invalid date format',
        });
      }

      if (endDateObj < startDateObj) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after or equal to start date',
        });
      }
    }

    next();
  };
}
