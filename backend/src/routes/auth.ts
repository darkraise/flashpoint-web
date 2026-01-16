import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { ActivityService } from '../services/ActivityService';
import { AppError } from '../middleware/errorHandler';
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

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
    }
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

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, `Validation error: ${error.errors[0].message}`));
    }
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
router.post('/logout', async (req, res, next) => {
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
});

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
