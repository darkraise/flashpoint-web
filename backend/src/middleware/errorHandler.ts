import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    logger.error(`[AppError] ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      stack: err.stack
    });

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode
      }
    });
  }

  // Unhandled errors - Log full details
  logger.error(`[UnhandledError] ${err.message}`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Also log the raw error to console for immediate visibility
  console.error('=== UNHANDLED ERROR ===');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('Request:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  console.error('======================');

  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500
    }
  });
}
