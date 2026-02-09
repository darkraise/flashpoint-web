import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Wraps async route handlers to catch errors and pass them to error middleware. */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;
