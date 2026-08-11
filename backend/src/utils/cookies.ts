import { CookieOptions, Request, Response } from 'express';
import { config } from '../config';

const REFRESH_COOKIE_NAME = 'fp_refresh';
const ACCESS_COOKIE_NAME = 'fp_access';

/**
 * Whether to mark auth cookies Secure.
 *
 * Derived per request rather than from NODE_ENV: a browser discards a Secure
 * cookie delivered over plain HTTP, so a fixed `true` breaks every LAN
 * deployment served without TLS, while a fixed `false` would strip the flag from
 * genuinely HTTPS traffic. One deployment can be reached both ways, so the
 * connection at hand decides.
 *
 * COOKIE_SECURE overrides the detection when an operator knows better —
 * for example a TLS-terminating proxy that does not send X-Forwarded-Proto.
 */
export function resolveSecureFlag(
  isRequestSecure: boolean,
  override: boolean | 'auto' = config.cookieSecure
): boolean {
  return override === 'auto' ? isRequestSecure : override;
}

function isSecureRequest(req: Request): boolean {
  // req.secure honours X-Forwarded-Proto because `trust proxy` is enabled.
  return resolveSecureFlag(req.secure);
}

function getRefreshCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshTokenCookie(req: Request, res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(req));
}

export function clearRefreshTokenCookie(req: Request, res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/api/auth',
  });
}

export function getRefreshTokenFromCookie(cookies: Record<string, string>): string | undefined {
  return cookies?.[REFRESH_COOKIE_NAME];
}

function getAccessCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/api',
    maxAge: 60 * 60 * 1000,
  };
}

export function setAccessTokenCookie(req: Request, res: Response, accessToken: string): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions(req));
}

export function clearAccessTokenCookie(req: Request, res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/api',
  });
}

export function getAccessTokenFromCookie(cookies: Record<string, string>): string | undefined {
  return cookies?.[ACCESS_COOKIE_NAME];
}
