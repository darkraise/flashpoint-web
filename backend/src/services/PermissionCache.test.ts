import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PermissionCache } from './PermissionCache';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PermissionCache', () => {
  beforeEach(() => {
    // Clear all caches before each test
    PermissionCache.clearAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    PermissionCache.stopCleanup();
  });

  describe('getUserPermissions', () => {
    it('should return null for non-existent user', () => {
      const result = PermissionCache.getUserPermissions(999);
      expect(result).toBeNull();
    });

    it('should return cached permissions', () => {
      const permissions = ['games.read', 'games.play'];
      PermissionCache.setUserPermissions(1, permissions);

      const result = PermissionCache.getUserPermissions(1);
      expect(result).toEqual(permissions);
    });

    it('should return null for expired permissions', async () => {
      // Set permissions
      PermissionCache.setUserPermissions(1, ['games.read']);

      // Mock Date.now to simulate TTL expiration
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6 * 60 * 1000); // 6 minutes later

      const result = PermissionCache.getUserPermissions(1);
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('setUserPermissions', () => {
    it('should cache permissions', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);

      const result = PermissionCache.getUserPermissions(1);
      expect(result).toEqual(['games.read']);
    });

    it('should update existing cached permissions', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setUserPermissions(1, ['games.read', 'games.play']);

      const result = PermissionCache.getUserPermissions(1);
      expect(result).toEqual(['games.read', 'games.play']);
    });
  });

  describe('getRolePermissions', () => {
    it('should return null for non-existent role', () => {
      const result = PermissionCache.getRolePermissions(999);
      expect(result).toBeNull();
    });

    it('should return cached role permissions', () => {
      const permissions = ['games.read', 'games.play'];
      PermissionCache.setRolePermissions(1, permissions);

      const result = PermissionCache.getRolePermissions(1);
      expect(result).toEqual(permissions);
    });

    it('should return null for expired role permissions', () => {
      PermissionCache.setRolePermissions(1, ['games.read']);

      // Mock Date.now to simulate TTL expiration
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 11 * 60 * 1000); // 11 minutes later

      const result = PermissionCache.getRolePermissions(1);
      expect(result).toBeNull();

      Date.now = originalNow;
    });
  });

  describe('invalidateUser', () => {
    it('should remove user from cache', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      expect(PermissionCache.getUserPermissions(1)).toBeDefined();

      PermissionCache.invalidateUser(1);

      expect(PermissionCache.getUserPermissions(1)).toBeNull();
    });

    it('should not affect other users', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setUserPermissions(2, ['games.play']);

      PermissionCache.invalidateUser(1);

      expect(PermissionCache.getUserPermissions(1)).toBeNull();
      expect(PermissionCache.getUserPermissions(2)).toEqual(['games.play']);
    });
  });

  describe('invalidateRole', () => {
    it('should remove role from cache', () => {
      PermissionCache.setRolePermissions(1, ['games.read']);
      expect(PermissionCache.getRolePermissions(1)).toBeDefined();

      PermissionCache.invalidateRole(1);

      expect(PermissionCache.getRolePermissions(1)).toBeNull();
    });

    it('should clear all user permissions', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setUserPermissions(2, ['games.play']);
      PermissionCache.setRolePermissions(1, ['admin.all']);

      PermissionCache.invalidateRole(1);

      expect(PermissionCache.getUserPermissions(1)).toBeNull();
      expect(PermissionCache.getUserPermissions(2)).toBeNull();
    });
  });

  describe('invalidateAllUsers', () => {
    it('should clear all user permissions', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setUserPermissions(2, ['games.play']);
      PermissionCache.setRolePermissions(1, ['admin.all']);

      PermissionCache.invalidateAllUsers();

      expect(PermissionCache.getUserPermissions(1)).toBeNull();
      expect(PermissionCache.getUserPermissions(2)).toBeNull();
      expect(PermissionCache.getRolePermissions(1)).toEqual(['admin.all']);
    });
  });

  describe('invalidateAllRoles', () => {
    it('should clear all role permissions', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setRolePermissions(1, ['admin.all']);
      PermissionCache.setRolePermissions(2, ['user.all']);

      PermissionCache.invalidateAllRoles();

      expect(PermissionCache.getUserPermissions(1)).toEqual(['games.read']);
      expect(PermissionCache.getRolePermissions(1)).toBeNull();
      expect(PermissionCache.getRolePermissions(2)).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should clear all caches', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setRolePermissions(1, ['admin.all']);

      PermissionCache.clearAll();

      expect(PermissionCache.getUserPermissions(1)).toBeNull();
      expect(PermissionCache.getRolePermissions(1)).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct counts', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setUserPermissions(2, ['games.play']);
      PermissionCache.setRolePermissions(1, ['admin.all']);

      const stats = PermissionCache.getStats();

      expect(stats.userCacheSize).toBe(2);
      expect(stats.roleCacheSize).toBe(1);
      expect(stats.totalSize).toBe(3);
    });

    it('should return zeros for empty cache', () => {
      const stats = PermissionCache.getStats();

      expect(stats.userCacheSize).toBe(0);
      expect(stats.roleCacheSize).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      PermissionCache.setUserPermissions(1, ['games.read']);
      PermissionCache.setRolePermissions(1, ['admin.all']);

      // Mock Date.now to simulate TTL expiration
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 15 * 60 * 1000); // 15 minutes later

      PermissionCache.cleanup();

      // Restore Date.now for assertions
      Date.now = originalNow;

      // Cache entries should be removed during cleanup
      const stats = PermissionCache.getStats();
      expect(stats.userCacheSize).toBe(0);
      expect(stats.roleCacheSize).toBe(0);
    });
  });

  describe('startCleanup / stopCleanup', () => {
    it('should start and stop cleanup interval', () => {
      PermissionCache.startCleanup();
      // Should not throw
      PermissionCache.stopCleanup();
    });

    it('should not create multiple intervals', () => {
      PermissionCache.startCleanup();
      PermissionCache.startCleanup(); // Should not create another
      PermissionCache.stopCleanup();
    });
  });
});
