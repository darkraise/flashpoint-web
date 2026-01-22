import { CachedSystemSettingsService } from './CachedSystemSettingsService';
import { AuthSettings } from '../types/auth';

/**
 * Auth Settings Service
 * Provides typed interface for auth-related settings from system_settings table
 * Uses CachedSystemSettingsService for performance optimization
 */
export class AuthSettingsService {
  private systemSettings: CachedSystemSettingsService;

  constructor() {
    // Use cached version for better performance (auth settings accessed frequently)
    this.systemSettings = new CachedSystemSettingsService(60000); // 1 minute TTL
  }

  /**
   * Get auth settings
   */
  getSettings(): AuthSettings {
    const authSettings = this.systemSettings.getCategory('auth');

    // Get the latest updated_at and updated_by from any auth setting
    const latestUpdate = this.getLatestUpdate();

    return {
      guestAccessEnabled: authSettings.guestAccessEnabled ?? true,
      userRegistrationEnabled: authSettings.userRegistrationEnabled ?? true,
      requireEmailVerification: authSettings.requireEmailVerification ?? false,
      sessionTimeoutMinutes: authSettings.sessionTimeoutMinutes ?? 60,
      maxLoginAttempts: authSettings.maxLoginAttempts ?? 5,
      lockoutDurationMinutes: authSettings.lockoutDurationMinutes ?? 15,
      updatedAt: latestUpdate.updatedAt,
      updatedBy: latestUpdate.updatedBy
    };
  }

  /**
   * Update auth settings
   */
  updateSettings(data: Partial<AuthSettings>, updatedBy: number): AuthSettings {
    // Filter out non-setting fields (updatedAt, updatedBy)
    const { updatedAt, updatedBy: _, ...settingsToUpdate } = data;

    if (Object.keys(settingsToUpdate).length === 0) {
      return this.getSettings();
    }

    // Update each setting individually to track updated_by
    this.systemSettings.updateCategory('auth', settingsToUpdate, updatedBy);

    return this.getSettings();
  }

  /**
   * Get the latest update timestamp and user from auth settings
   */
  private getLatestUpdate(): { updatedAt: string; updatedBy: number | undefined } {
    const row = this.systemSettings.get('auth.user_registration_enabled');

    // Get metadata for the most recently updated auth setting
    const query = `
      SELECT updated_at, updated_by
      FROM system_settings
      WHERE category = 'auth'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const result = require('./UserDatabaseService').UserDatabaseService.get(query, []);

    return {
      updatedAt: result?.updated_at || new Date().toISOString(),
      updatedBy: result?.updated_by
    };
  }
}
