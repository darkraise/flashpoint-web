import { CachedSystemSettingsService } from './CachedSystemSettingsService';
import { UserDatabaseService } from './UserDatabaseService';
import { AuthSettings } from '../types/auth';

/**
 * Auth Settings Service
 * Provides typed interface for auth-related settings from system_settings table
 * Uses CachedSystemSettingsService for performance optimization
 */
export class AuthSettingsService {
  private systemSettings: CachedSystemSettingsService;

  constructor() {
    // Use cached singleton for better performance (auth settings accessed frequently)
    this.systemSettings = CachedSystemSettingsService.getInstance();
  }

  /**
   * Get auth settings
   */
  getSettings(): AuthSettings {
    const authSettings = this.systemSettings.getCategory('auth');

    // Get the latest updated_at and updated_by from any auth setting
    const latestUpdate = this.getLatestUpdate();

    return {
      guestAccessEnabled:
        typeof authSettings.guestAccessEnabled === 'boolean'
          ? authSettings.guestAccessEnabled
          : true,
      userRegistrationEnabled:
        typeof authSettings.userRegistrationEnabled === 'boolean'
          ? authSettings.userRegistrationEnabled
          : true,
      requireEmailVerification:
        typeof authSettings.requireEmailVerification === 'boolean'
          ? authSettings.requireEmailVerification
          : false,
      sessionTimeoutMinutes:
        typeof authSettings.sessionTimeoutMinutes === 'number'
          ? authSettings.sessionTimeoutMinutes
          : 60,
      maxLoginAttempts:
        typeof authSettings.maxLoginAttempts === 'number' ? authSettings.maxLoginAttempts : 5,
      lockoutDurationMinutes:
        typeof authSettings.lockoutDurationMinutes === 'number'
          ? authSettings.lockoutDurationMinutes
          : 15,
      updatedAt: latestUpdate.updatedAt,
      updatedBy: latestUpdate.updatedBy,
    };
  }

  /**
   * Update auth settings
   */
  updateSettings(data: Partial<AuthSettings>, updatedBy: number): AuthSettings {
    // Filter out non-setting fields (updatedAt, updatedBy)
    const { updatedAt: _updatedAt, updatedBy: _, ...settingsToUpdate } = data;

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
    // Get metadata for the most recently updated auth setting
    const query = `
      SELECT updated_at, updated_by
      FROM system_settings
      WHERE category = 'auth'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const result = UserDatabaseService.get<{ updated_at: string; updated_by: number | null }>(
      query,
      []
    );

    return {
      updatedAt: result?.updated_at || new Date().toISOString(),
      updatedBy: result?.updated_by ?? undefined,
    };
  }
}
