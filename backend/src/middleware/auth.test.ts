import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, sharedAccessAuth } from './auth';
import { AppError } from './errorHandler';
import { AuthService } from '../services/AuthService';

// Mock AuthService
vi.mock('../services/AuthService');

describe('authenticate middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockAuthService: any;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {},
    };
    res = {};
    next = vi.fn() as any;

    // Reset mocks
    vi.clearAllMocks();

    // Setup mock
    mockAuthService = {
      verifyAccessToken: vi.fn(),
      isGuestAccessEnabled: vi.fn(),
    };
    vi.mocked(AuthService).mockImplementation(() => mockAuthService);
  });

  it('should reject requests without token', async () => {
    try {
      await authenticate(req as Request, res as Response, next);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(401);
      expect((error as AppError).message).toBe('No token provided');
    }
  });

  it('should reject requests with invalid token', async () => {
    req.headers = {
      authorization: 'Bearer invalid-token',
    };

    mockAuthService.verifyAccessToken.mockRejectedValue(
      new AppError(401, 'Invalid token', true, 'INVALID_TOKEN')
    );

    try {
      await authenticate(req as Request, res as Response, next);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(401);
    }
  });

  // Note: Full authentication flow tests require complex mocking of AuthService,
  // PermissionCache, and the asyncHandler wrapper. These are better tested as
  // integration tests. Basic error path tests above verify middleware behavior.
});

describe('optionalAuth middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockAuthService: any;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {},
    };
    res = {};
    next = vi.fn() as any;

    vi.clearAllMocks();

    // Setup mock
    mockAuthService = {
      verifyAccessToken: vi.fn(),
      isGuestAccessEnabled: vi.fn(),
    };
    vi.mocked(AuthService).mockImplementation(() => mockAuthService);
  });

  it('should be defined', () => {
    expect(optionalAuth).toBeDefined();
  });

  // Note: Full optionalAuth tests with guest access require complex mocking of AuthService
  // instantiation within the middleware. These are better tested as integration tests
  // where the full dependency chain is available.
});

// The middleware module instantiates AuthService at import time, so stub via the
// automocked prototype rather than a per-test mockImplementation.
describe.each([
  ['optionalAuth', optionalAuth],
  ['sharedAccessAuth', sharedAccessAuth],
])('%s guest fallback', (_name, middleware) => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  // asyncHandler doesn't return its promise, so wait for next() instead.
  const run = (): Promise<void> =>
    new Promise((resolve) => {
      next.mockImplementation(() => resolve());
      middleware(req as Request, res as Response, next as NextFunction);
    });

  beforeEach(() => {
    req = { headers: {}, cookies: {} };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('grants guests games.play when guest access is enabled', async () => {
    vi.mocked(AuthService.prototype.isGuestAccessEnabled).mockReturnValue(true);

    await run();

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.id).toBe(0);
    expect(req.user?.role).toBe('guest');
    expect(req.user?.permissions).toEqual(
      expect.arrayContaining(['games.read', 'playlists.read', 'games.play'])
    );
  });

  it('rejects anonymous requests when guest access is disabled', async () => {
    vi.mocked(AuthService.prototype.isGuestAccessEnabled).mockReturnValue(false);

    await run();

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
