import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
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

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...(body as Record<string, unknown>) };
  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'secret',
    'apiKey',
    'accessToken',
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // If headers are already sent (e.g., during SSE streaming), delegate to Express default handler
  if (res.headersSent) {
    logger.error(`[ErrorHandler] Error after headers sent: ${err.message}`, {
      path: req.path,
      method: req.method,
    });
    return _next(err);
  }

  if (err instanceof AppError) {
    logger.error(`[AppError] ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      stack: err.stack,
    });

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        ...(err.code && { code: err.code }),
      },
    });
  }

  if (err instanceof ZodError) {
    logger.error(`[ValidationError] Zod validation failed`, {
      path: req.path,
      method: req.method,
      errors: err.errors,
    });

    return res.status(400).json({
      error: {
        message: `Validation error: ${err.errors.map((e) => e.message).join(', ')}`,
        statusCode: 400,
      },
    });
  }

  logger.error(`[UnhandledError] ${err.message}`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params,
  });

  // Return generic error message to client (prevent information leakage)
  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
    },
  });
}
