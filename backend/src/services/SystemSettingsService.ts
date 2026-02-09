import { UserDatabaseService } from './UserDatabaseService';
import { SettingValue, SettingRow, CategorySettings, SettingDataType } from '../types/settings';

export class SystemSettingsService {
  get(key: string): SettingValue | null {
    const row = UserDatabaseService.get(
      'SELECT value, data_type, default_value FROM system_settings WHERE key = ?',
      [key]
    ) as SettingRow | undefined;

    if (!row) {
      return null;
    }

    const valueToUse = row.value ?? row.default_value;
    return this.parseValue(valueToUse, row.data_type);
  }

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
      const valueToUse = row.value ?? row.default_value;
      const parsedValue = this.parseValue(valueToUse, row.data_type);
      if (parsedValue !== null) {
        settings[camelCaseKey] = parsedValue;
      }
    });

    return settings;
  }

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
      const valueToUse = row.value ?? row.default_value;
      const parsedValue = this.parseValue(valueToUse, row.data_type);
      if (parsedValue !== null) {
        allSettings[row.category][camelCaseKey] = parsedValue;
      }
    });

    return allSettings;
  }

  set(key: string, value: SettingValue, updatedBy?: number): void {
    const existing = UserDatabaseService.get<{ key: string }>(
      'SELECT key FROM system_settings WHERE key = ?',
      [key]
    );
    if (!existing) {
      throw new Error(`Setting '${key}' does not exist`);
    }

    // Validate before setting
    this.validate(key, value);

    const stringValue = this.stringifyValue(value);

    UserDatabaseService.run(
      `UPDATE system_settings
       SET value = ?, updated_by = ?, updated_at = ?
       WHERE key = ?`,
      [stringValue, updatedBy ?? null, new Date().toISOString(), key]
    );
  }

  updateCategory(category: string, settings: CategorySettings, updatedBy?: number): void {
    const db = UserDatabaseService.getDatabase();
    db.transaction(() => {
      Object.entries(settings).forEach(([key, value]) => {
        const snakeKey = this.camelToSnake(key);
        const fullKey = `${category}.${snakeKey}`;
        this.set(fullKey, value, updatedBy);
      });
    })();
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
      const valueToUse = row.value ?? row.default_value;
      const parsedValue = this.parseValue(valueToUse, row.data_type);
      if (parsedValue !== null) {
        publicSettings[row.category][camelCaseKey] = parsedValue;
      }
    });

    return publicSettings;
  }

  exists(key: string): boolean {
    const row = UserDatabaseService.get('SELECT 1 FROM system_settings WHERE key = ?', [key]);
    return !!row;
  }

  resetToDefault(key: string, updatedBy?: number): void {
    UserDatabaseService.run(
      `UPDATE system_settings
       SET value = default_value, updated_by = ?, updated_at = ?
       WHERE key = ?`,
      [updatedBy ?? null, new Date().toISOString(), key]
    );
  }

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
      defaultValue: this.parseValue(row.default_value, row.data_type),
    };
  }

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
      throw new Error(
        `Invalid validation schema for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateAgainstSchema(
    value: SettingValue,
    schema: Record<string, unknown>,
    key: string
  ): void {
    // Type validation
    if (typeof schema.type === 'string') {
      const actualType = this.getType(value);

      // Allow integers when schema expects 'number' (e.g., 0, 1 are valid for float settings)
      const isValidType =
        actualType === schema.type || (schema.type === 'number' && actualType === 'integer');

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

  private parseValue(value: string | null, dataType: SettingDataType): SettingValue | null {
    if (value === null || value === undefined) {
      return null;
    }

    switch (dataType) {
      case 'boolean':
        return value === '1' || value === 'true';
      case 'number': {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      }
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

  private stringifyValue(value: SettingValue): string {
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
