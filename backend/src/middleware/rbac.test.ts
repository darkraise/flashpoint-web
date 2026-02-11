import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requirePermission } from './rbac';
import { AppError } from './errorHandler';

describe('requirePermission middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = vi.fn() as any;
  });

  it('should reject requests without req.user', () => {
    const middleware = requirePermission('games.read');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('should reject users without required permission', () => {
    req.user = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: ['games.read'],
    };

    const middleware = requirePermission('users.write');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Insufficient permissions');
  });

  it('should allow users with required permission', () => {
    req.user = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: ['games.read', 'games.play'],
    };

    const middleware = requirePermission('games.play');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(); // Called without error
  });

  it('should allow users with any of multiple required permissions', () => {
    req.user = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: ['games.read', 'games.play'],
    };

    const middleware = requirePermission('games.write', 'games.play', 'games.delete');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(); // Called without error - has games.play
  });

  it('should reject users with no permissions array', () => {
    req.user = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      permissions: undefined as any,
    };

    const middleware = requirePermission('games.read');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });
});
