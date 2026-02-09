import { CookieOptions, Response } from 'express';
import { config } from '../config';

const REFRESH_COOKIE_NAME = 'fp_refresh';
const ACCESS_COOKIE_NAME = 'fp_access';
const isProduction = config.nodeEnv === 'production';

// ===================================
// Refresh Token Cookie (30 days, /api/auth path)
// ===================================

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
  });
}

export function getRefreshTokenFromCookie(cookies: Record<string, string>): string | undefined {
  return cookies?.[REFRESH_COOKIE_NAME];
}

// ===================================
// Access Token Cookie (1 hour, /api path)
// ===================================

function getAccessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api',
    maxAge: 60 * 60 * 1000, // 1 hour in ms
  };
}

export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions());
}

export function clearAccessTokenCookie(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api',
  });
}

export function getAccessTokenFromCookie(cookies: Record<string, string>): string | undefined {
  return cookies?.[ACCESS_COOKIE_NAME];
}
