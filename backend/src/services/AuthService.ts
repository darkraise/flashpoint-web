import { UserDatabaseService } from './UserDatabaseService';
import { SystemSettingsService } from './SystemSettingsService';
import { CachedSystemSettingsService } from './CachedSystemSettingsService';
import { PermissionCache } from './PermissionCache';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import { LoginCredentials, RegisterData, AuthTokens, AuthUser } from '../types/auth';

/**
 * User data for token generation
 */
interface UserTokenData {
  id: number;
  username: string;
  role_name: string;
}

/**
 * Auth settings shape from system_settings
 */
interface AuthSettings {
  guest_access_enabled: number;
  user_registration_enabled: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
}

export class AuthService {
  private systemSettings: SystemSettingsService;
  private cachedSystemSettings: CachedSystemSettingsService;

  constructor() {
    this.systemSettings = new SystemSettingsService();
    this.cachedSystemSettings = CachedSystemSettingsService.getInstance();
  }

  /**
   * Login user with username/password
   */
  async login(
    credentials: LoginCredentials,
    ipAddress: string
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      const { username, password } = credentials;

      // Check login attempts and lockout
      await this.checkLoginAttempts(username, ipAddress);

      // Find user
      const user = UserDatabaseService.get(
        `SELECT u.*, r.name as role_name, r.priority
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.username = ? AND u.is_active = 1`,
        [username]
      );

      if (!user) {
        await this.recordLoginAttempt(username, ipAddress, false);
        throw new AppError(401, 'Invalid username or password');
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        await this.recordLoginAttempt(username, ipAddress, false);
        throw new AppError(401, 'Invalid username or password');
      }

      // Record successful login
      await this.recordLoginAttempt(username, ipAddress, true);

      // Update last login
      UserDatabaseService.run('UPDATE users SET last_login_at = ? WHERE id = ?', [
        new Date().toISOString(),
        user.id,
      ]);

      // Get user permissions
      const permissions = this.getUserPermissions(user.id);
      logger.debug(`[AuthService] User ${username} has ${permissions.length} permissions`);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        permissions,
        themeColor: user.theme_color || 'blue-500',
        surfaceColor: user.surface_color || 'slate-700',
      };

      return { user: authUser, tokens };
    } catch (error) {
      logger.error('[AuthService] Login error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        username: credentials.username,
      });
      throw error;
    }
  }

  /**
   * Register new user
   *
   * Dual Purpose:
   * 1. Initial Setup: Creates first admin account when no users exist (bypasses all registration settings)
   * 2. Regular Registration: Creates standard user account (requires user_registration_enabled = true)
   *
   * The method automatically detects which scenario applies based on whether users exist
   */
  async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Hash password before transaction
    const passwordHash = await hashPassword(data.password);

    // Wrap setup check + uniqueness checks + insert in transaction to prevent race condition
    const db = UserDatabaseService.getDatabase();
    const registerTransaction = db.transaction(() => {
      // Check username uniqueness inside transaction
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
      if (existingUser) {
        throw new AppError(409, 'Username already exists');
      }

      // Check email uniqueness inside transaction
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
      if (existingEmail) {
        throw new AppError(409, 'Email already exists');
      }

      // Check if this is initial setup (no users exist)
      const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const isInitialSetup = count.count === 0;

      // Validation: Regular registration requires registration to be enabled
      // Initial setup bypasses this check (first user is always allowed)
      if (!isInitialSetup) {
        const settings = this.getAuthSettings();
        if (!settings.user_registration_enabled) {
          throw new AppError(403, 'User registration is currently disabled');
        }
      }

      // First user becomes admin (role_id = 1), subsequent users get 'user' role (role_id = 2)
      const roleId = isInitialSetup ? 1 : 2;
      const result = db
        .prepare('INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)')
        .run(data.username, data.email, passwordHash, roleId);

      if (isInitialSetup) {
        logger.info('╔═══════════════════════════════════════════════════════════════╗');
        logger.info('║  INITIAL ADMIN ACCOUNT CREATED                                ║');
        logger.info(`║  Username: ${data.username.padEnd(48)} ║`);
        logger.info('║  The first user has been granted administrator privileges.    ║');
        logger.info('╚═══════════════════════════════════════════════════════════════╝');
      }

      return result.lastInsertRowid as number;
    });

    const userId = registerTransaction();

    // Apply default theme and primary color from system settings
    const appSettings = this.cachedSystemSettings.getCategory('app');
    const defaultTheme = appSettings.defaultTheme || 'dark';
    const defaultPrimaryColor = appSettings.defaultPrimaryColor || 'blue';

    // Insert default user settings
    UserDatabaseService.run(
      `INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES
       (?, 'theme_mode', ?),
       (?, 'primary_color', ?)`,
      [userId, defaultTheme, userId, defaultPrimaryColor]
    );

    logger.info(
      `[AuthService] Created user ${data.username} with default theme: ${defaultTheme}, primary color: ${defaultPrimaryColor}`
    );

    // Get created user
    const user = UserDatabaseService.get(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    // Get permissions
    const permissions = this.getUserPermissions(userId);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_name,
      permissions,
      themeColor: user.theme_color || 'blue-500',
      surfaceColor: user.surface_color || 'slate-700',
    };

    return { user: authUser, tokens };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    UserDatabaseService.run('UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?', [
      new Date().toISOString(),
      refreshToken,
    ]);
  }

  /**
   * Revoke all refresh tokens for a user
   * Useful when user permissions change, account is disabled, or password is reset
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    UserDatabaseService.run(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
      [new Date().toISOString(), userId]
    );

    logger.info(`[AuthService] Revoked all refresh tokens for user ${userId}`);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify token is valid and not revoked
    const tokenRecord = UserDatabaseService.get(
      `SELECT * FROM refresh_tokens
       WHERE token = ? AND revoked_at IS NULL AND expires_at > ?`,
      [refreshToken, new Date().toISOString()]
    );

    if (!tokenRecord) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Get user
    const user = UserDatabaseService.get(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.is_active = 1`,
      [tokenRecord.user_id]
    );

    if (!user) {
      throw new AppError(401, 'User not found or inactive');
    }

    // Revoke the old refresh token (security best practice)
    UserDatabaseService.run('UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?', [
      new Date().toISOString(),
      refreshToken,
    ]);

    logger.debug(`[AuthService] Revoked old refresh token for user ${user.id}`);

    // Generate new tokens
    return this.generateTokens(user);
  }

  /**
   * Verify access token and get user
   */
  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload = verifyToken(token);

      // Get user with current data
      const user = UserDatabaseService.get(
        `SELECT u.*, r.name as role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ? AND u.is_active = 1`,
        [payload.userId]
      );

      if (!user) {
        throw new AppError(401, 'User not found or inactive');
      }

      const permissions = this.getUserPermissions(user.id);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        permissions,
      };
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }

  /**
   * Get user permissions (with caching)
   */
  private getUserPermissions(userId: number): string[] {
    // Try to get from cache first
    const cached = PermissionCache.getUserPermissions(userId);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - query database
    const permissions = UserDatabaseService.all(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ?`,
      [userId]
    );

    const permissionNames = permissions.map((p) => p.name);

    // Store in cache
    PermissionCache.setUserPermissions(userId, permissionNames);

    return permissionNames;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: UserTokenData): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role_name,
    });

    const refreshToken = generateRefreshToken();

    // Store refresh token
    UserDatabaseService.run(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES (?, ?, datetime('now', '+30 days'))`,
      [user.id, refreshToken]
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
    };
  }

  /**
   * Check login attempts and enforce lockout
   */
  private async checkLoginAttempts(username: string, ipAddress: string): Promise<void> {
    const settings = this.getAuthSettings();
    const lockoutDuration = settings.lockout_duration_minutes;
    const maxAttempts = settings.max_login_attempts;

    // Validate and sanitize lockoutDuration to prevent SQL injection
    // Ensure it's a number between 1 and 1440 (24 hours)
    const safeLockoutDuration = Math.min(
      Math.max(parseInt(String(lockoutDuration), 10) || 15, 1),
      1440
    );

    // Count failed attempts in lockout window - using parameterized query
    const failedAttempts = UserDatabaseService.get(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE (username = ? OR ip_address = ?)
       AND success = 0
       AND attempted_at > datetime('now', '-' || ? || ' minutes')`,
      [username, ipAddress, safeLockoutDuration]
    );

    if (failedAttempts?.count >= maxAttempts) {
      throw new AppError(
        429,
        `Too many login attempts. Please try again in ${safeLockoutDuration} minutes.`
      );
    }
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(
    username: string,
    ipAddress: string,
    success: boolean
  ): Promise<void> {
    UserDatabaseService.run(
      'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)',
      [username, ipAddress, success ? 1 : 0]
    );
    // Note: Cleanup of old attempts is handled by scheduled background job
    // See server.ts loginAttemptsCleanupInterval
  }

  /**
   * Clean up old login attempts (older than 24 hours)
   * Called by scheduled background job in server.ts
   */
  async cleanupOldLoginAttempts(): Promise<void> {
    const result = UserDatabaseService.run(
      `DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-24 hours')`
    );
    if (result.changes > 0) {
      logger.info(`[AuthService] Cleaned up ${result.changes} old login attempts`);
    }
  }

  /**
   * Get auth settings from system_settings
   */
  private getAuthSettings(): AuthSettings {
    try {
      const authSettings = this.systemSettings.getCategory('auth');

      // Return settings with defaults if not found
      return {
        guest_access_enabled:
          authSettings.guestAccessEnabled !== undefined
            ? authSettings.guestAccessEnabled
              ? 1
              : 0
            : 1,
        user_registration_enabled:
          authSettings.userRegistrationEnabled !== undefined
            ? authSettings.userRegistrationEnabled
              ? 1
              : 0
            : 1,
        max_login_attempts:
          typeof authSettings.maxLoginAttempts === 'number' ? authSettings.maxLoginAttempts : 5,
        lockout_duration_minutes:
          typeof authSettings.lockoutDurationMinutes === 'number'
            ? authSettings.lockoutDurationMinutes
            : 15,
      };
    } catch (error) {
      logger.error('Failed to get auth settings, using defaults:', error);
      // Return defaults if settings can't be retrieved
      return {
        guest_access_enabled: 1,
        user_registration_enabled: 1,
        max_login_attempts: 5,
        lockout_duration_minutes: 15,
      };
    }
  }

  /**
   * Check if guest access is enabled
   */
  isGuestAccessEnabled(): boolean {
    const settings = this.getAuthSettings();
    return settings.guest_access_enabled === 1;
  }
}
