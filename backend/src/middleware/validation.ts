import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './errorHandler';

/**
 * Validation Middleware Factory
 *
 * Creates a middleware that validates request data against a Zod schema
 */

type RequestProperty = 'body' | 'query' | 'params';

/**
 * Create a validation middleware for a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param property - Which request property to validate ('body', 'query', or 'params')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const createUserSchema = z.object({
 *   username: z.string().min(3).max(50),
 *   email: z.string().email(),
 *   password: z.string().min(6)
 * });
 *
 * router.post('/users',
 *   validateRequest(createUserSchema, 'body'),
 *   async (req, res) => {
 *     // req.body is now validated and typed
 *     const user = await createUser(req.body);
 *     res.json(user);
 *   }
 * );
 * ```
 */
export function validateRequest<T extends z.ZodType>(
  schema: T,
  property: RequestProperty = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request property
      const validated = schema.parse(req[property]);

      // Replace the request property with validated data
      req[property] = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Extract first validation error message
        const firstError = error.errors[0];
        const message = firstError
          ? `Validation error: ${firstError.message}`
          : 'Validation error';

        return next(new AppError(400, message));
      }

      // Pass other errors to error handler
      next(error);
    }
  };
}

/**
 * Validate multiple request properties at once
 *
 * @param schemas - Object mapping request properties to their schemas
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.get('/users/:id/posts',
 *   validateMultiple({
 *     params: z.object({ id: z.string().uuid() }),
 *     query: z.object({
 *       limit: z.coerce.number().int().min(1).max(100).optional(),
 *       offset: z.coerce.number().int().min(0).optional()
 *     })
 *   }),
 *   async (req, res) => {
 *     // Both params and query are validated
 *     const posts = await getUserPosts(req.params.id, req.query);
 *     res.json(posts);
 *   }
 * );
 * ```
 */
export function validateMultiple(schemas: Partial<Record<RequestProperty, z.ZodType>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate each specified property
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
        const message = firstError
          ? `Validation error: ${firstError.message}`
          : 'Validation error';

        return next(new AppError(400, message));
      }

      next(error);
    }
  };
}
