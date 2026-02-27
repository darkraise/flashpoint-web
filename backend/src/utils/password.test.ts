import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword } from './password';

// Mock config
vi.mock('../config', () => ({
  config: {
    bcryptSaltRounds: 10,
  },
}));

describe('password utilities', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should generate different hashes for same password (due to salt)', async () => {
      const password = 'samepassword';

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hash of correct length', async () => {
      const password = 'testpassword';
      const hash = await hashPassword(password);

      // bcrypt hashes are 60 characters
      expect(hash).toHaveLength(60);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should handle unicode characters in password', async () => {
      const password = '\u4e2d\u6587\u65e5\u672c\ud83d\ude00';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'correctpassword';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const password = 'correctpassword';
      const hash = await hashPassword(password);

      const result = await verifyPassword('wrongpassword', hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      const password = 'somepassword';
      const hash = await hashPassword(password);

      const result = await verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('should return true when both password and hash are from empty string', async () => {
      const hash = await hashPassword('');

      const result = await verifyPassword('', hash);

      expect(result).toBe(true);
    });

    it('should handle case-sensitive passwords correctly', async () => {
      const password = 'CaseSensitive';
      const hash = await hashPassword(password);

      expect(await verifyPassword('CaseSensitive', hash)).toBe(true);
      expect(await verifyPassword('casesensitive', hash)).toBe(false);
      expect(await verifyPassword('CASESENSITIVE', hash)).toBe(false);
    });

    it('should reject similar but different passwords', async () => {
      const password = 'password123';
      const hash = await hashPassword(password);

      expect(await verifyPassword('password123 ', hash)).toBe(false);
      expect(await verifyPassword(' password123', hash)).toBe(false);
      expect(await verifyPassword('password12', hash)).toBe(false);
      expect(await verifyPassword('password1234', hash)).toBe(false);
    });
  });
});
