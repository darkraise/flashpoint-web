import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Handler Middleware
 *
 * Wraps async route handlers to automatically catch errors and pass them to error middleware.
 * Eliminates the need for try-catch blocks in every route handler.
 *
 * @example
 * ```typescript
 * // Before (with try-catch)
 * router.get('/games', async (req, res, next) => {
 *   try {
 *     const games = await GameService.searchGames(...);
 *     res.json(games);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // After (with asyncHandler)
 * router.get('/games', asyncHandler(async (req, res) => {
 *   const games = await GameService.searchGames(...);
 *   res.json(games);
 * }));
 * ```
 *
 * @param fn - The async route handler function
 * @returns Express middleware function that handles promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Type alias for async route handlers
 * Useful for maintaining type safety when using asyncHandler
 *
 * @example
 * ```typescript
 * const getGames: AsyncRouteHandler = async (req, res) => {
 *   const games = await GameService.searchGames(...);
 *   res.json(games);
 * };
 *
 * router.get('/games', asyncHandler(getGames));
 * ```
 */
export type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;
