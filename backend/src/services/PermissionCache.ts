import { logger } from '../utils/logger';

/**
 * In-memory cache for user permissions with TTL (Time To Live)
 * Reduces database queries by caching permission lookups
 *
 * Cache Strategy:
 * - User permissions cached by userId with 5-minute TTL
 * - Role permissions cached by roleId with 10-minute TTL
 * - Automatic expiration and cleanup
 * - Manual invalidation when permissions change
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class PermissionCache {
  private static userPermissionsCache = new Map<number, CacheEntry<string[]>>();
  private static rolePermissionsCache = new Map<number, CacheEntry<string[]>>();

  // Cache TTL in milliseconds
  private static readonly USER_PERMISSIONS_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly ROLE_PERMISSIONS_TTL = 10 * 60 * 1000; // 10 minutes

  // Cleanup interval
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start the cache cleanup interval (called once on app startup)
   */
  static startCleanup(): void {
    if (this.cleanupInterval) return;

    // Run cleanup every 5 minutes (unref to allow graceful shutdown)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
    this.cleanupInterval.unref();

    logger.info('[PermissionCache] Cleanup interval started');
  }

  /**
   * Stop the cleanup interval (called on app shutdown)
   */
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('[PermissionCache] Cleanup interval stopped');
    }
  }

  static getUserPermissions(userId: number): string[] | null {
    const entry = this.userPermissionsCache.get(userId);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.userPermissionsCache.delete(userId);
      logger.debug(`[PermissionCache] User ${userId} permissions expired`);
      return null;
    }

    logger.debug(`[PermissionCache] Cache HIT for user ${userId}`);
    return entry.data;
  }

  static setUserPermissions(userId: number, permissions: string[]): void {
    this.userPermissionsCache.set(userId, {
      data: permissions,
      expiresAt: Date.now() + this.USER_PERMISSIONS_TTL,
    });

    logger.debug(
      `[PermissionCache] Cached permissions for user ${userId} (${permissions.length} permissions, TTL: 5min)`
    );
  }

  static getRolePermissions(roleId: number): string[] | null {
    const entry = this.rolePermissionsCache.get(roleId);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.rolePermissionsCache.delete(roleId);
      logger.debug(`[PermissionCache] Role ${roleId} permissions expired`);
      return null;
    }

    logger.debug(`[PermissionCache] Cache HIT for role ${roleId}`);
    return entry.data;
  }

  static setRolePermissions(roleId: number, permissions: string[]): void {
    this.rolePermissionsCache.set(roleId, {
      data: permissions,
      expiresAt: Date.now() + this.ROLE_PERMISSIONS_TTL,
    });

    logger.debug(
      `[PermissionCache] Cached permissions for role ${roleId} (${permissions.length} permissions, TTL: 10min)`
    );
  }

  /**
   * Invalidate user permissions (when user role changes)
   */
  static invalidateUser(userId: number): void {
    this.userPermissionsCache.delete(userId);
    logger.info(`[PermissionCache] Invalidated cache for user ${userId}`);
  }

  /**
   * Invalidate role permissions (when role permissions change)
   * Also invalidates all user permissions to force re-fetch
   */
  static invalidateRole(roleId: number): void {
    this.rolePermissionsCache.delete(roleId);
    this.userPermissionsCache.clear();
    logger.info(`[PermissionCache] Invalidated cache for role ${roleId} and all user permissions`);
  }

  static invalidateAllUsers(): void {
    const count = this.userPermissionsCache.size;
    this.userPermissionsCache.clear();
    logger.info(`[PermissionCache] Invalidated all user permissions (${count} entries)`);
  }

  static invalidateAllRoles(): void {
    const count = this.rolePermissionsCache.size;
    this.rolePermissionsCache.clear();
    logger.info(`[PermissionCache] Invalidated all role permissions (${count} entries)`);
  }

  static clearAll(): void {
    const userCount = this.userPermissionsCache.size;
    const roleCount = this.rolePermissionsCache.size;

    this.userPermissionsCache.clear();
    this.rolePermissionsCache.clear();

    logger.info(`[PermissionCache] Cleared all caches (${userCount} users, ${roleCount} roles)`);
  }

  static cleanup(): void {
    const now = Date.now();
    let userExpired = 0;
    let roleExpired = 0;

    // Cleanup user permissions
    for (const [userId, entry] of this.userPermissionsCache.entries()) {
      if (now > entry.expiresAt) {
        this.userPermissionsCache.delete(userId);
        userExpired++;
      }
    }

    // Cleanup role permissions
    for (const [roleId, entry] of this.rolePermissionsCache.entries()) {
      if (now > entry.expiresAt) {
        this.rolePermissionsCache.delete(roleId);
        roleExpired++;
      }
    }

    if (userExpired > 0 || roleExpired > 0) {
      logger.debug(
        `[PermissionCache] Cleanup: removed ${userExpired} user entries, ${roleExpired} role entries`
      );
    }
  }

  static getStats(): {
    userCacheSize: number;
    roleCacheSize: number;
    totalSize: number;
  } {
    return {
      userCacheSize: this.userPermissionsCache.size,
      roleCacheSize: this.rolePermissionsCache.size,
      totalSize: this.userPermissionsCache.size + this.rolePermissionsCache.size,
    };
  }
}
