import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './errorHandler';

type RequestProperty = 'body' | 'query' | 'params';

export function validateRequest<T extends z.ZodType>(
  schema: T,
  property: RequestProperty = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req[property]);
      req[property] = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const message = firstError ? `Validation error: ${firstError.message}` : 'Validation error';
        return next(new AppError(400, message));
      }

      next(error);
    }
  };
}

export function validateMultiple(schemas: Partial<Record<RequestProperty, z.ZodType>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const [property, schema] of Object.entries(schemas)) {
        if (schema) {
          const validated = schema.parse(req[property as RequestProperty]);
          req[property as RequestProperty] = validated;
        }
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const message = firstError ? `Validation error: ${firstError.message}` : 'Validation error';

        return next(new AppError(400, message));
      }

      next(error);
    }
  };
}
