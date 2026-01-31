import { SystemSettingsService } from './SystemSettingsService';
import { SettingValue, CategorySettings } from '../types/settings';

interface CacheEntry {
  value: SettingValue | CategorySettings;
  timestamp: number;
}

/**
 * Cached System Settings Service
 * Extends SystemSettingsService with in-memory caching for performance
 */
export class CachedSystemSettingsService extends SystemSettingsService {
  private cache: Map<string, CacheEntry> = new Map();
  private categoryCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number;

  /**
   * @param cacheTTL Cache time-to-live in milliseconds (default: 60000 = 1 minute)
   */
  constructor(cacheTTL: number = 60000) {
    super();
    this.cacheTTL = cacheTTL;

    // Start cache cleanup interval (every 5 minutes)
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get a single setting by key (with caching)
   */
  get(key: string): SettingValue | null {
    const cached = this.cache.get(key);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.value as SettingValue | null;
    }

    // Cache miss - fetch from database
    const value = super.get(key);

    if (value !== null) {
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });
    }

    return value;
  }

  /**
   * Get all settings in a category (with caching)
   */
  getCategory(category: string): CategorySettings {
    const cached = this.categoryCache.get(category);

    if (cached && this.isValid(cached.timestamp)) {
      return cached.value as CategorySettings;
    }

    // Cache miss - fetch from database
    const value = super.getCategory(category);

    this.categoryCache.set(category, {
      value,
      timestamp: Date.now()
    });

    return value;
  }

  /**
   * Set a single setting (invalidates cache)
   */
  set(key: string, value: SettingValue, updatedBy?: number): void {
    super.set(key, value, updatedBy);

    // Invalidate cache for this key
    this.cache.delete(key);

    // Invalidate category cache (key format is "category.setting_name")
    const category = key.split('.')[0];
    this.categoryCache.delete(category);
  }

  /**
   * Update multiple settings in a category (invalidates cache)
   */
  updateCategory(category: string, settings: CategorySettings, updatedBy?: number): void {
    super.updateCategory(category, settings, updatedBy);

    // Invalidate all keys in this category
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}.`)) {
        this.cache.delete(key);
      }
    }

    // Invalidate category cache
    this.categoryCache.delete(category);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.categoryCache.clear();
  }

  /**
   * Clear cache for a specific category
   */
  clearCategoryCache(category: string): void {
    // Clear individual key caches for this category
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}.`)) {
        this.cache.delete(key);
      }
    }

    // Clear category cache
    this.categoryCache.delete(category);
  }

  /**
   * Get cache statistics
   */
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
      size: this.estimateCacheSize()
    };
  }

  /**
   * Check if cached entry is still valid
   */
  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean key cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.cacheTTL) {
        this.cache.delete(key);
      }
    }

    // Clean category cache
    for (const [category, entry] of this.categoryCache.entries()) {
      if (now - entry.timestamp >= this.cacheTTL) {
        this.categoryCache.delete(category);
      }
    }
  }

  /**
   * Estimate cache size in bytes (approximate)
   */
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
