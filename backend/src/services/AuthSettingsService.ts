import { UserDatabaseService } from './UserDatabaseService';
import { AuthSettings } from '../types/auth';

export class AuthSettingsService {
  /**
   * Get auth settings
   */
  getSettings(): AuthSettings {
    const settings = UserDatabaseService.get('SELECT * FROM auth_settings WHERE id = 1', []);

    return {
      guestAccessEnabled: settings.guest_access_enabled === 1,
      userRegistrationEnabled: settings.user_registration_enabled === 1,
      requireEmailVerification: settings.require_email_verification === 1,
      sessionTimeoutMinutes: settings.session_timeout_minutes,
      maxLoginAttempts: settings.max_login_attempts,
      lockoutDurationMinutes: settings.lockout_duration_minutes,
      updatedAt: settings.updated_at,
      updatedBy: settings.updated_by
    };
  }

  /**
   * Update auth settings
   */
  updateSettings(data: Partial<AuthSettings>, updatedBy: number): AuthSettings {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.guestAccessEnabled !== undefined) {
      updates.push('guest_access_enabled = ?');
      params.push(data.guestAccessEnabled ? 1 : 0);
    }

    if (data.userRegistrationEnabled !== undefined) {
      updates.push('user_registration_enabled = ?');
      params.push(data.userRegistrationEnabled ? 1 : 0);
    }

    if (data.requireEmailVerification !== undefined) {
      updates.push('require_email_verification = ?');
      params.push(data.requireEmailVerification ? 1 : 0);
    }

    if (data.sessionTimeoutMinutes !== undefined) {
      updates.push('session_timeout_minutes = ?');
      params.push(data.sessionTimeoutMinutes);
    }

    if (data.maxLoginAttempts !== undefined) {
      updates.push('max_login_attempts = ?');
      params.push(data.maxLoginAttempts);
    }

    if (data.lockoutDurationMinutes !== undefined) {
      updates.push('lockout_duration_minutes = ?');
      params.push(data.lockoutDurationMinutes);
    }

    if (updates.length === 0) {
      return this.getSettings();
    }

    updates.push("updated_at = datetime('now')");
    updates.push('updated_by = ?');
    params.push(updatedBy);
    params.push(1); // WHERE id = 1

    UserDatabaseService.run(
      `UPDATE auth_settings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getSettings();
  }
}
