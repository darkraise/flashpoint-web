import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { ActivityService } from '../services/ActivityService';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from '../middleware/activityLogger';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();
const authService = new AuthService();
const activityService = new ActivityService();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6)
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const credentials = loginSchema.parse(req.body);
    const ipAddress = req.ip || '';

    logger.info(`[Auth] Login attempt for user: ${credentials.username} from ${ipAddress}`);

    const result = await authService.login(credentials, ipAddress);

    // Log activity
    await activityService.log({
      userId: result.user.id,
      username: result.user.username,
      action: 'login',
      resource: 'auth',
      ipAddress,
      userAgent: req.headers['user-agent']
    });

    logger.info(`[Auth] Login successful for user: ${credentials.username}`);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[Auth] Validation error during login: ${error.errors[0].message}`);
      return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
    }

    // Log failed login attempt
    const ipAddress = req.ip || '';
    const username = req.body.username || 'unknown';

    try {
      await activityService.log({
        userId: undefined,
        username,
        action: 'auth.login.failed',
        resource: 'auth',
        details: {
          reason: error instanceof Error && error.message.includes('Invalid')
            ? 'invalid_credentials'
            : 'other',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        ipAddress,
        userAgent: req.headers['user-agent']
      });
    } catch (logError) {
      // Don't fail request if logging fails
      logger.error('[Auth] Failed to log failed login attempt:', logError);
    }

    // Log the error with full details before passing to error handler
    logger.error(`[Auth] Login failed for user: ${username}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    next(error);
  }
});

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req, res, next) => {
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
      userAgent: req.headers['user-agent']
    });

    logger.info(`[Auth] Registration successful for user: ${data.username}`);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[Auth] Validation error during registration: ${error.errors[0].message}`);
      return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
    }

    logger.error(`[Auth] Registration failed for user: ${req.body.username}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
router.post(
  '/logout',
  logActivity('auth.logout', 'auth'),
  async (req, res, next) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      await authService.logout(refreshToken);

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
      }
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    const tokens = await authService.refreshToken(refreshToken);

    res.json(tokens);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
    }
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyAccessToken(token);

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
