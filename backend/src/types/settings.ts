/**
 * Backend Settings Types
 *
 * Type definitions for system settings storage and retrieval.
 * These types define the structure of settings in the database.
 */

/**
 * Supported data types for settings values
 */
export type SettingDataType = 'string' | 'number' | 'boolean' | 'json';

/**
 * Possible setting value types
 */
export type SettingValue = string | number | boolean | Record<string, unknown>;

/**
 * Database row structure for system_settings table
 */
export interface SettingRow {
  key: string;
  value: string | null;
  data_type: SettingDataType;
  default_value: string;
  category: string;
  description: string | null;
  updated_by: number | null;
  updated_at: string;
  is_public: number;
  validation_schema: string | null;
}

/**
 * Parsed setting with typed value (after database retrieval and parsing)
 */
export interface ParsedSetting {
  key: string;
  value: SettingValue;
  dataType: SettingDataType;
  category: string;
  description: string | null;
  updatedAt: string;
  updatedBy: number | null;
}

/**
 * Settings grouped by category
 * Key is the setting name (camelCase), value is the setting value
 */
export type CategorySettings = Record<string, SettingValue>;

/**
 * Cache entry for settings
 */
export interface SettingCacheEntry {
  value: SettingValue;
  timestamp: number;
}
