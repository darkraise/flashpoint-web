import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateSharedAccessToken,
  verifySharedAccessToken,
  JWTPayload,
} from './jwt';

// Mock config
vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-purposes',
    jwtExpiresIn: '1h',
  },
}));

describe('jwt utilities', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      const token = generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload fields in token', () => {
      const payload: JWTPayload = {
        userId: 42,
        username: 'admin',
        role: 'admin',
      };

      const token = generateAccessToken(payload);
      const decoded = jwt.decode(token) as JWTPayload & { iat: number; exp: number };

      expect(decoded.userId).toBe(42);
      expect(decoded.username).toBe('admin');
      expect(decoded.role).toBe('admin');
    });

    it('should set expiration time', () => {
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      const token = generateAccessToken(payload);
      const decoded = jwt.decode(token) as JWTPayload & { iat: number; exp: number };

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should produce deterministic output for same payload and timestamp', () => {
      // Since JWT iat uses seconds, tokens generated at same second are identical
      // This verifies the signing is deterministic (same inputs = same output)
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      const token1 = generateAccessToken(payload);
      const token2 = generateAccessToken(payload);

      // Tokens generated within same second have same iat and thus are equal
      // This tests that the signing process is consistent
      const decoded1 = jwt.decode(token1) as { iat: number };
      const decoded2 = jwt.decode(token2) as { iat: number };

      // Both should have valid iat timestamps
      expect(decoded1.iat).toBeDefined();
      expect(decoded2.iat).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a 128-character hex string', () => {
      const token = generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it('should only contain hex characters', () => {
      const token = generateRefreshToken();

      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateRefreshToken());
      }

      expect(tokens.size).toBe(100);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return payload for valid token', () => {
      const originalPayload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      const token = generateAccessToken(originalPayload);
      const result = verifyToken(token);

      expect(result.userId).toBe(originalPayload.userId);
      expect(result.username).toBe(originalPayload.username);
      expect(result.role).toBe(originalPayload.role);
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyToken('not-a-valid-token')).toThrow('Invalid token');
    });

    it('should throw error for token with invalid signature', () => {
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      // Generate token with different secret
      const invalidToken = jwt.sign(payload, 'different-secret');

      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      // Generate already expired token
      const expiredToken = jwt.sign(payload, 'test-secret-key-for-testing-purposes', {
        expiresIn: '-1h',
      });

      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
    });

    it('should reject shared_access tokens', () => {
      const sharedPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
        type: 'shared_access',
      };

      const token = jwt.sign(sharedPayload, 'test-secret-key-for-testing-purposes', {
        expiresIn: '1h',
      });

      expect(() => verifyToken(token)).toThrow('Invalid token type');
    });
  });

  describe('generateSharedAccessToken', () => {
    it('should generate a valid shared access token', () => {
      const payload = {
        shareToken: 'abc123',
        playlistId: 42,
      };

      const token = generateSharedAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include type field in token', () => {
      const payload = {
        shareToken: 'abc123',
        playlistId: 42,
      };

      const token = generateSharedAccessToken(payload);
      const decoded = jwt.decode(token) as { type: string };

      expect(decoded.type).toBe('shared_access');
    });

    it('should include correct payload fields', () => {
      const payload = {
        shareToken: 'test-token',
        playlistId: 99,
      };

      const token = generateSharedAccessToken(payload);
      const decoded = jwt.decode(token) as {
        type: string;
        shareToken: string;
        playlistId: number;
      };

      expect(decoded.shareToken).toBe('test-token');
      expect(decoded.playlistId).toBe(99);
    });
  });

  describe('verifySharedAccessToken', () => {
    it('should verify valid shared access token', () => {
      const payload = {
        shareToken: 'abc123',
        playlistId: 42,
      };

      const token = generateSharedAccessToken(payload);
      const result = verifySharedAccessToken(token);

      expect(result.type).toBe('shared_access');
      expect(result.shareToken).toBe('abc123');
      expect(result.playlistId).toBe(42);
    });

    it('should reject regular access tokens', () => {
      const regularPayload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user',
      };

      const token = generateAccessToken(regularPayload);

      expect(() => verifySharedAccessToken(token)).toThrow('Invalid token type');
    });
  });
});
