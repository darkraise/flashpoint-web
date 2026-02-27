import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  setAccessTokenCookie,
  clearAccessTokenCookie,
  getAccessTokenFromCookie,
} from './cookies';

// Mock config - default to development mode
vi.mock('../config', () => ({
  config: {
    nodeEnv: 'development',
  },
}));

describe('cookies utilities', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };
  });

  describe('setRefreshTokenCookie', () => {
    it('should set refresh token cookie with correct name', () => {
      setRefreshTokenCookie(mockRes as Response, 'test-refresh-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'fp_refresh',
        'test-refresh-token',
        expect.any(Object)
      );
    });

    it('should set httpOnly flag', () => {
      setRefreshTokenCookie(mockRes as Response, 'test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set sameSite to lax', () => {
      setRefreshTokenCookie(mockRes as Response, 'test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ sameSite: 'lax' })
      );
    });

    it('should set path to /api/auth', () => {
      setRefreshTokenCookie(mockRes as Response, 'test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ path: '/api/auth' })
      );
    });

    it('should set 30-day maxAge', () => {
      setRefreshTokenCookie(mockRes as Response, 'test-token');

      const expectedMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ maxAge: expectedMaxAge })
      );
    });

    it('should set secure to false in development', () => {
      setRefreshTokenCookie(mockRes as Response, 'test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ secure: false })
      );
    });
  });

  describe('clearRefreshTokenCookie', () => {
    it('should clear the refresh token cookie', () => {
      clearRefreshTokenCookie(mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('fp_refresh', expect.any(Object));
    });

    it('should use correct options when clearing', () => {
      clearRefreshTokenCookie(mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'fp_refresh',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/auth',
        })
      );
    });
  });

  describe('getRefreshTokenFromCookie', () => {
    it('should return refresh token from cookies', () => {
      const cookies = { fp_refresh: 'my-refresh-token' };

      const result = getRefreshTokenFromCookie(cookies);

      expect(result).toBe('my-refresh-token');
    });

    it('should return undefined if cookie not present', () => {
      const cookies = { other_cookie: 'value' };

      const result = getRefreshTokenFromCookie(cookies);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty cookies', () => {
      const result = getRefreshTokenFromCookie({});

      expect(result).toBeUndefined();
    });

    it('should handle undefined cookies object', () => {
      const result = getRefreshTokenFromCookie(undefined as unknown as Record<string, string>);

      expect(result).toBeUndefined();
    });
  });

  describe('setAccessTokenCookie', () => {
    it('should set access token cookie with correct name', () => {
      setAccessTokenCookie(mockRes as Response, 'test-access-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'fp_access',
        'test-access-token',
        expect.any(Object)
      );
    });

    it('should set httpOnly flag', () => {
      setAccessTokenCookie(mockRes as Response, 'test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });

    it('should set path to /api', () => {
      setAccessTokenCookie(mockRes as Response, 'test-token');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ path: '/api' })
      );
    });

    it('should set 1-hour maxAge', () => {
      setAccessTokenCookie(mockRes as Response, 'test-token');

      const expectedMaxAge = 60 * 60 * 1000; // 1 hour in ms
      expect(mockRes.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ maxAge: expectedMaxAge })
      );
    });
  });

  describe('clearAccessTokenCookie', () => {
    it('should clear the access token cookie', () => {
      clearAccessTokenCookie(mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('fp_access', expect.any(Object));
    });

    it('should use correct options when clearing', () => {
      clearAccessTokenCookie(mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'fp_access',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api',
        })
      );
    });
  });

  describe('getAccessTokenFromCookie', () => {
    it('should return access token from cookies', () => {
      const cookies = { fp_access: 'my-access-token' };

      const result = getAccessTokenFromCookie(cookies);

      expect(result).toBe('my-access-token');
    });

    it('should return undefined if cookie not present', () => {
      const cookies = { other_cookie: 'value' };

      const result = getAccessTokenFromCookie(cookies);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty cookies', () => {
      const result = getAccessTokenFromCookie({});

      expect(result).toBeUndefined();
    });
  });
});
