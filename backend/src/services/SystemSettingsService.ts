import { UserDatabaseService } from './UserDatabaseService';
import { SettingValue, SettingRow, CategorySettings, SettingDataType } from '../types/settings';

/**
 * System Settings Service
 * Handles key-value storage for flexible system-wide settings
 */
export class SystemSettingsService {
  /**
   * Get a single setting by key
   */
  get(key: string): SettingValue | null {
    const row = UserDatabaseService.get(
      'SELECT value, data_type, default_value FROM system_settings WHERE key = ?',
      [key]
    ) as SettingRow | undefined;

    if (!row) {
      return null;
    }

    const valueToUse = row.value || row.default_value;
    return this.parseValue(valueToUse, row.data_type);
  }

  /**
   * Get all settings in a category
   */
  getCategory(category: string): CategorySettings {
    const rows = UserDatabaseService.all(
      'SELECT key, value, data_type, default_value FROM system_settings WHERE category = ?',
      [category]
    ) as SettingRow[];

    const settings: CategorySettings = {};

    rows.forEach((row) => {
      // Remove category prefix from key (e.g., 'auth.guest_access_enabled' -> 'guestAccessEnabled')
      const shortKey = row.key.replace(`${category}.`, '');
      const camelCaseKey = this.snakeToCamel(shortKey);
      const valueToUse = row.value || row.default_value;
      const parsedValue = this.parseValue(valueToUse, row.data_type);
      if (parsedValue !== null) {
        settings[camelCaseKey] = parsedValue;
      }
    });

    return settings;
  }

  /**
   * Get all settings grouped by category
   */
  getAll(): Record<string, CategorySettings> {
    const rows = UserDatabaseService.all(
      'SELECT key, value, data_type, default_value, category FROM system_settings',
      []
    ) as SettingRow[];

    const allSettings: Record<string, CategorySettings> = {};

    rows.forEach((row) => {
      if (!allSettings[row.category]) {
        allSettings[row.category] = {};
      }

      const shortKey = row.key.replace(`${row.category}.`, '');
      const camelCaseKey = this.snakeToCamel(shortKey);
      const valueToUse = row.value || row.default_value;
      const parsedValue = this.parseValue(valueToUse, row.data_type);
      if (parsedValue !== null) {
        allSettings[row.category][camelCaseKey] = parsedValue;
      }
    });

    return allSettings;
  }

  /**
   * Set a single setting by key
   */
  set(key: string, value: SettingValue, updatedBy?: number): void {
    // Validate before setting
    this.validate(key, value);

    const stringValue = this.stringifyValue(value);

    UserDatabaseService.run(
      `UPDATE system_settings
       SET value = ?, updated_by = ?, updated_at = ?
       WHERE key = ?`,
      [stringValue, updatedBy || null, new Date().toISOString(), key]
    );
  }

  /**
   * Update multiple settings in a category
   */
  updateCategory(category: string, settings: CategorySettings, updatedBy?: number): void {
    // Use individual updates (transactions would require accessing private db property)
    Object.entries(settings).forEach(([key, value]) => {
      const snakeKey = this.camelToSnake(key);
      const fullKey = `${category}.${snakeKey}`;
      this.set(fullKey, value, updatedBy);
    });
  }

  /**
   * Get public settings (accessible without authentication)
   */
  getPublicSettings(): Record<string, CategorySettings> {
    const rows = UserDatabaseService.all(
      'SELECT key, value, data_type, default_value, category FROM system_settings WHERE is_public = 1',
      []
    ) as SettingRow[];

    const publicSettings: Record<string, CategorySettings> = {};

    rows.forEach((row) => {
      if (!publicSettings[row.category]) {
        publicSettings[row.category] = {};
      }

      const shortKey = row.key.replace(`${row.category}.`, '');
      const camelCaseKey = this.snakeToCamel(shortKey);
      const valueToUse = row.value || row.default_value;
      const parsedValue = this.parseValue(valueToUse, row.data_type);
      if (parsedValue !== null) {
        publicSettings[row.category][camelCaseKey] = parsedValue;
      }
    });

    return publicSettings;
  }

  /**
   * Check if a setting exists
   */
  exists(key: string): boolean {
    const row = UserDatabaseService.get(
      'SELECT 1 FROM system_settings WHERE key = ?',
      [key]
    );
    return !!row;
  }

  /**
   * Reset a setting to its default value
   */
  resetToDefault(key: string, updatedBy?: number): void {
    UserDatabaseService.run(
      `UPDATE system_settings
       SET value = default_value, updated_by = ?, updated_at = ?
       WHERE key = ?`,
      [updatedBy || null, new Date().toISOString(), key]
    );
  }

  /**
   * Get setting metadata
   */
  getMetadata(key: string): {
    key: string;
    dataType: string;
    category: string;
    description: string | null;
    isPublic: boolean;
    defaultValue: SettingValue | null;
  } | null {
    const row = UserDatabaseService.get(
      'SELECT key, data_type, category, description, is_public, default_value FROM system_settings WHERE key = ?',
      [key]
    ) as SettingRow | undefined;

    if (!row) {
      return null;
    }

    return {
      key: row.key,
      dataType: row.data_type,
      category: row.category,
      description: row.description,
      isPublic: row.is_public === 1,
      defaultValue: this.parseValue(row.default_value, row.data_type)
    };
  }

  /**
   * Validate a value against its JSON schema
   */
  validate(key: string, value: SettingValue): void {
    const row = UserDatabaseService.get(
      'SELECT validation_schema, data_type FROM system_settings WHERE key = ?',
      [key]
    ) as SettingRow | undefined;

    if (!row || !row.validation_schema) {
      return; // No validation schema defined
    }

    try {
      const schema = JSON.parse(row.validation_schema);
      this.validateAgainstSchema(value, schema, key);
    } catch (error) {
      throw new Error(`Invalid validation schema for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate value against JSON schema
   */
  private validateAgainstSchema(value: SettingValue, schema: Record<string, unknown>, key: string): void {
    // Type validation
    if (typeof schema.type === 'string') {
      const actualType = this.getType(value);

      // Allow integers when schema expects 'number' (e.g., 0, 1 are valid for float settings)
      const isValidType = actualType === schema.type ||
        (schema.type === 'number' && actualType === 'integer');

      if (!isValidType) {
        throw new Error(`Setting '${key}' must be of type ${schema.type}, got ${actualType}`);
      }
    }

    // Enum validation
    if (Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        throw new Error(`Setting '${key}' must be one of: ${schema.enum.join(', ')}`);
      }
    }

    // Number/Integer validation
    if (schema.type === 'integer' || schema.type === 'number') {
      if (typeof value === 'number') {
        if (typeof schema.minimum === 'number' && value < schema.minimum) {
          throw new Error(`Setting '${key}' must be >= ${schema.minimum}`);
        }
        if (typeof schema.maximum === 'number' && value > schema.maximum) {
          throw new Error(`Setting '${key}' must be <= ${schema.maximum}`);
        }
      }
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
        throw new Error(`Setting '${key}' must be at least ${schema.minLength} characters`);
      }
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
        throw new Error(`Setting '${key}' must be at most ${schema.maxLength} characters`);
      }
    }
  }

  /**
   * Get JavaScript type name for validation
   */
  private getType(value: SettingValue): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  /**
   * Parse value based on data type
   */
  private parseValue(value: string | null, dataType: SettingDataType): SettingValue | null {
    if (value === null || value === undefined) {
      return null;
    }

    switch (dataType) {
      case 'boolean':
        return value === '1' || value === 'true';
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Stringify value for storage
   */
  private stringifyValue(value: SettingValue): string {
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Convert snake_case to camelCase
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
