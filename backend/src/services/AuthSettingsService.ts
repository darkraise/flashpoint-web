import { CachedSystemSettingsService } from './CachedSystemSettingsService';
import { UserDatabaseService } from './UserDatabaseService';
import { AuthSettings } from '../types/auth';

export class AuthSettingsService {
  private systemSettings: CachedSystemSettingsService;

  constructor() {
    this.systemSettings = CachedSystemSettingsService.getInstance();
  }

  getSettings(): AuthSettings {
    const authSettings = this.systemSettings.getCategory('auth');

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

  updateSettings(data: Partial<AuthSettings>, updatedBy: number): AuthSettings {
    const { updatedAt: _updatedAt, updatedBy: _updatedBy, ...settingsToUpdate } = data;

    if (Object.keys(settingsToUpdate).length === 0) {
      return this.getSettings();
    }

    this.systemSettings.updateCategory('auth', settingsToUpdate, updatedBy);

    return this.getSettings();
  }

  private getLatestUpdate(): { updatedAt: string; updatedBy: number | undefined } {
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
