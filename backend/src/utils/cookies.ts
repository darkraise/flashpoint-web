import { CookieOptions, Response } from 'express';
import { config } from '../config';

const COOKIE_NAME = 'fp_refresh';
const isProduction = config.nodeEnv === 'production';

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
  res.cookie(COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
  });
}

export function getRefreshTokenFromCookie(cookies: Record<string, string>): string | undefined {
  return cookies?.[COOKIE_NAME];
}
