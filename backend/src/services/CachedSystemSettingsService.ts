import { SystemSettingsService } from './SystemSettingsService';
import { SettingValue, CategorySettings } from '../types/settings';

interface CacheEntry {
  value: SettingValue | CategorySettings | null;
  timestamp: number;
}

/**
 * Cached System Settings Service (Singleton)
 * Extends SystemSettingsService with in-memory caching for performance.
 * Use getInstance() to get the singleton instance.
 */
export class CachedSystemSettingsService extends SystemSettingsService {
  private static instance: CachedSystemSettingsService | null = null;

  private cache: Map<string, CacheEntry> = new Map();
  private categoryCache: Map<string, CacheEntry> = new Map();
  private publicSettingsCache: CacheEntry | null = null;
  private cacheTTL: number;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Get the singleton instance
   * @param cacheTTL Cache time-to-live in milliseconds (default: 60000 = 1 minute)
   *                 Only used on first call, ignored on subsequent calls
   */
  static getInstance(cacheTTL: number = 60000): CachedSystemSettingsService {
    if (!CachedSystemSettingsService.instance) {
      CachedSystemSettingsService.instance = new CachedSystemSettingsService(cacheTTL);
    }
    return CachedSystemSettingsService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (CachedSystemSettingsService.instance) {
      CachedSystemSettingsService.instance.dispose();
      CachedSystemSettingsService.instance = null;
    }
  }

  /**
   * Private constructor - use getInstance() instead
   * @param cacheTTL Cache time-to-live in milliseconds (default: 60000 = 1 minute)
   */
  private constructor(cacheTTL: number = 60000) {
    super();
    this.cacheTTL = cacheTTL;

    // Start cache cleanup interval (every 5 minutes)
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  /**
   * Stop the cleanup interval and release resources
   * Call this when disposing the service instance
   */
  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.clearCache();
  }

  get(key: string): SettingValue | null {
    const cached = this.cache.get(key);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.value as SettingValue | null;
    }

    const value = super.get(key);

    // Cache null values too to avoid repeated DB queries for missing keys
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });

    return value;
  }

  getCategory(category: string): CategorySettings {
    const cached = this.categoryCache.get(category);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.value as CategorySettings;
    }

    const value = super.getCategory(category);

    this.categoryCache.set(category, {
      value,
      timestamp: Date.now(),
    });

    return value;
  }

  getPublicSettings(): Record<string, CategorySettings> {
    if (this.publicSettingsCache && this.isValid(this.publicSettingsCache.timestamp)) {
      return this.publicSettingsCache.value as Record<string, CategorySettings>;
    }

    const value = super.getPublicSettings();

    this.publicSettingsCache = {
      value,
      timestamp: Date.now(),
    };

    return value;
  }

  set(key: string, value: SettingValue, updatedBy?: number): void {
    super.set(key, value, updatedBy);

    this.cache.delete(key);

    // Key format is "category.setting_name"
    const category = key.split('.')[0];
    this.categoryCache.delete(category);
    this.publicSettingsCache = null;
  }

  updateCategory(category: string, settings: CategorySettings, updatedBy?: number): void {
    super.updateCategory(category, settings, updatedBy);

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}.`)) {
        this.cache.delete(key);
      }
    }

    this.categoryCache.delete(category);
    this.publicSettingsCache = null;
  }

  clearCache(): void {
    this.cache.clear();
    this.categoryCache.clear();
    this.publicSettingsCache = null;
  }

  clearCategoryCache(category: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}.`)) {
        this.cache.delete(key);
      }
    }

    this.categoryCache.delete(category);
    this.publicSettingsCache = null;
  }

  getCacheStats(): {
    keyCount: number;
    categoryCount: number;
    hitRate: number;
    size: number;
  } {
    return {
      keyCount: this.cache.size,
      categoryCount: this.categoryCache.size,
      hitRate: 0, // Would need hit/miss tracking for accurate calculation
      size: this.estimateCacheSize(),
    };
  }

  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.cacheTTL) {
        this.cache.delete(key);
      }
    }

    for (const [category, entry] of this.categoryCache.entries()) {
      if (now - entry.timestamp >= this.cacheTTL) {
        this.categoryCache.delete(category);
      }
    }
  }

  private estimateCacheSize(): number {
    let size = 0;

    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.value).length;
    }

    for (const entry of this.categoryCache.values()) {
      size += JSON.stringify(entry.value).length;
    }

    return size;
  }
}
