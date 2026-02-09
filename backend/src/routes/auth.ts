import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/AuthService';
import { ActivityService } from '../services/ActivityService';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/asyncHandler';
import { softAuth } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';
import { logger } from '../utils/logger';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  setAccessTokenCookie,
  clearAccessTokenCookie,
  getAccessTokenFromCookie,
} from '../utils/cookies';
import { z } from 'zod';

const router = Router();
const authService = new AuthService();
const activityService = new ActivityService();

// Rate limiters for authentication endpoints
// Stricter limits on login to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: {
    error: {
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts
  handler: (req, res) => {
    logger.warn(`[Security] Rate limit exceeded for login from IP: ${req.ip}`);
    res.status(429).json({
      error: {
        message: 'Too many login attempts from this IP, please try again after 15 minutes',
        statusCode: 429,
      },
    });
  },
});

// Moderate limits on registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour per IP
  message: {
    error: {
      message: 'Too many registration attempts from this IP, please try again after an hour',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[Security] Rate limit exceeded for registration from IP: ${req.ip}`);
    res.status(429).json({
      error: {
        message: 'Too many registration attempts from this IP, please try again after an hour',
        statusCode: 429,
      },
    });
  },
});

// Moderate limits on token refresh
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 refresh requests per minute per IP
  message: {
    error: {
      message: 'Too many token refresh attempts from this IP, please try again later',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[Security] Rate limit exceeded for token refresh from IP: ${req.ip}`);
    res.status(429).json({
      error: {
        message: 'Too many token refresh attempts from this IP, please try again later',
        statusCode: 429,
      },
    });
  },
});

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * GET /api/auth/setup-status
 * Check if the system needs initial setup (no users exist)
 * Public endpoint - no authentication required
 */
router.get('/setup-status', (req, res) => {
  const needsSetup = UserDatabaseService.needsInitialSetup();
  res.json({
    needsSetup,
    message: needsSetup
      ? 'No users found. Please create an administrator account.'
      : 'System is configured',
  });
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const ipAddress = req.ip || '';

      logger.debug(`[Auth] Login attempt for user: ${credentials.username} from ${ipAddress}`);

      const result = await authService.login(credentials, ipAddress);

      // Log activity
      await activityService.log({
        userId: result.user.id,
        username: result.user.username,
        action: 'login',
        resource: 'auth',
        ipAddress,
        userAgent: req.headers['user-agent'],
      });

      logger.info(`[Auth] Login successful for user: ${credentials.username}`);

      // Set tokens as HTTP-only cookies
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      setAccessTokenCookie(res, result.tokens.accessToken);

      res.json({
        user: result.user,
        tokens: {
          expiresIn: result.tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const username =
          typeof req.body?.username === 'string' ? req.body.username.substring(0, 50) : 'unknown';
        logger.warn(`[Auth] Validation error during login for user: ${username}`);
        throw new AppError(
          400,
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }

      // Log failed login attempt
      const ipAddress = req.ip || '';
      const username =
        typeof req.body?.username === 'string' ? req.body.username.substring(0, 50) : 'unknown';

      try {
        await activityService.log({
          userId: undefined,
          username,
          action: 'auth.login.failed',
          resource: 'auth',
          details: {
            reason:
              error instanceof Error && error.message.includes('Invalid')
                ? 'invalid_credentials'
                : 'other',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
          ipAddress,
          userAgent: req.headers['user-agent'],
        });
      } catch (logError) {
        // Don't fail request if logging fails
        logger.error('[Auth] Failed to log failed login attempt:', logError);
      }

      // Log the error with full details before passing to error handler
      logger.warn(`[Auth] Login failed for user: ${username}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  })
);

/**
 * POST /api/auth/register
 * Register new user
 *
 * Dual Purpose:
 * 1. Initial Setup: When no users exist, creates first admin account (bypasses registration settings)
 * 2. Regular Registration: When users exist, creates regular user account (requires registration enabled)
 *
 * The AuthService.register() method automatically detects which scenario applies
 */
router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      logger.info(`[Auth] Registration attempt for user: ${data.username}`);

      const result = await authService.register(data);

      // Log activity
      await activityService.log({
        userId: result.user.id,
        username: result.user.username,
        action: 'register',
        resource: 'auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info(`[Auth] Registration successful for user: ${data.username}`);

      // Set tokens as HTTP-only cookies
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      setAccessTokenCookie(res, result.tokens.accessToken);

      res.status(201).json({
        user: result.user,
        tokens: {
          expiresIn: result.tokens.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const username =
          typeof req.body?.username === 'string' ? req.body.username.substring(0, 50) : 'unknown';
        logger.warn(`[Auth] Validation error during registration for user: ${username}`);
        throw new AppError(
          400,
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }

      const username =
        typeof req.body?.username === 'string' ? req.body.username.substring(0, 50) : 'unknown';
      logger.error(`[Auth] Registration failed for user: ${username}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  })
);

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
router.post(
  '/logout',
  softAuth,
  logActivity('auth.logout', 'auth'),
  asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromCookie(req.cookies);

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res);
    clearAccessTokenCookie(res);

    res.json({ success: true, message: 'Logged out successfully' });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromCookie(req.cookies);

    if (!refreshToken) {
      throw new AppError(401, 'No refresh token provided');
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Set new token cookies (token rotation)
    setRefreshTokenCookie(res, tokens.refreshToken);
    setAccessTokenCookie(res, tokens.accessToken);

    res.json({
      expiresIn: tokens.expiresIn,
    });
  })
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    // Read access token from cookie first, fallback to Authorization header
    const token =
      getAccessTokenFromCookie(req.cookies) ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7)
        : undefined);

    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const user = await authService.verifyAccessToken(token);

    res.json(user);
  })
);

export default router;
