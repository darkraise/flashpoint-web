import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Sanitize request body by redacting sensitive fields
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'secret',
    'apiKey',
    'accessToken'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
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
        statusCode: err.statusCode,
        ...(err.code && { code: err.code })
      }
    });
  }

  // Unhandled errors - Log full details with sanitization
  logger.error(`[UnhandledError] ${err.message}`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params
  });

  // Return generic error message to client (prevent information leakage)
  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500
    }
  });
}
