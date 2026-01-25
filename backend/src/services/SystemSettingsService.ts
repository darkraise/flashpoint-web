import { UserDatabaseService } from './UserDatabaseService';

/**
 * System Settings Service
 * Handles key-value storage for flexible system-wide settings
 */
export class SystemSettingsService {
  /**
   * Get a single setting by key
   */
  get(key: string): any {
    const row = UserDatabaseService.get(
      'SELECT value, data_type, default_value FROM system_settings WHERE key = ?',
      [key]
    );

    if (!row) {
      return null;
    }

    const valueToUse = row.value || row.default_value;
    return this.parseValue(valueToUse, row.data_type);
  }

  /**
   * Get all settings in a category
   */
  getCategory(category: string): Record<string, any> {
    const rows = UserDatabaseService.all(
      'SELECT key, value, data_type, default_value FROM system_settings WHERE category = ?',
      [category]
    );

    const settings: Record<string, any> = {};

    rows.forEach((row: any) => {
      // Remove category prefix from key (e.g., 'auth.guest_access_enabled' -> 'guestAccessEnabled')
      const shortKey = row.key.replace(`${category}.`, '');
      const camelCaseKey = this.snakeToCamel(shortKey);
      const valueToUse = row.value || row.default_value;
      settings[camelCaseKey] = this.parseValue(valueToUse, row.data_type);
    });

    return settings;
  }

  /**
   * Get all settings grouped by category
   */
  getAll(): Record<string, Record<string, any>> {
    const rows = UserDatabaseService.all(
      'SELECT key, value, data_type, default_value, category FROM system_settings',
      []
    );

    const allSettings: Record<string, Record<string, any>> = {};

    rows.forEach((row: any) => {
      if (!allSettings[row.category]) {
        allSettings[row.category] = {};
      }

      const shortKey = row.key.replace(`${row.category}.`, '');
      const camelCaseKey = this.snakeToCamel(shortKey);
      const valueToUse = row.value || row.default_value;
      allSettings[row.category][camelCaseKey] = this.parseValue(valueToUse, row.data_type);
    });

    return allSettings;
  }

  /**
   * Set a single setting by key
   */
  set(key: string, value: any, updatedBy?: number): void {
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
  updateCategory(category: string, settings: Record<string, any>, updatedBy?: number): void {
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
  getPublicSettings(): Record<string, any> {
    const rows = UserDatabaseService.all(
      'SELECT key, value, data_type, default_value, category FROM system_settings WHERE is_public = 1',
      []
    );

    const publicSettings: Record<string, Record<string, any>> = {};

    rows.forEach((row: any) => {
      if (!publicSettings[row.category]) {
        publicSettings[row.category] = {};
      }

      const shortKey = row.key.replace(`${row.category}.`, '');
      const camelCaseKey = this.snakeToCamel(shortKey);
      const valueToUse = row.value || row.default_value;
      publicSettings[row.category][camelCaseKey] = this.parseValue(valueToUse, row.data_type);
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
    defaultValue: any;
  } | null {
    const row = UserDatabaseService.get(
      'SELECT key, data_type, category, description, is_public, default_value FROM system_settings WHERE key = ?',
      [key]
    );

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
  validate(key: string, value: any): void {
    const row = UserDatabaseService.get(
      'SELECT validation_schema, data_type FROM system_settings WHERE key = ?',
      [key]
    );

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
  private validateAgainstSchema(value: any, schema: any, key: string): void {
    // Type validation
    if (schema.type) {
      const actualType = this.getType(value);

      // Allow integers when schema expects 'number' (e.g., 0, 1 are valid for float settings)
      const isValidType = actualType === schema.type ||
        (schema.type === 'number' && actualType === 'integer');

      if (!isValidType) {
        throw new Error(`Setting '${key}' must be of type ${schema.type}, got ${actualType}`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      throw new Error(`Setting '${key}' must be one of: ${schema.enum.join(', ')}`);
    }

    // Number/Integer validation
    if (schema.type === 'integer' || schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new Error(`Setting '${key}' must be >= ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new Error(`Setting '${key}' must be <= ${schema.maximum}`);
      }
    }

    // String validation
    if (schema.type === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        throw new Error(`Setting '${key}' must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        throw new Error(`Setting '${key}' must be at most ${schema.maxLength} characters`);
      }
    }
  }

  /**
   * Get JavaScript type name for validation
   */
  private getType(value: any): string {
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
  private parseValue(value: string | null, dataType: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (dataType) {
      case 'boolean':
        return value === '1' || value === 'true';
      case 'integer':
        return parseInt(value, 10);
      case 'float':
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
  private stringifyValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (typeof value === 'object') {
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
