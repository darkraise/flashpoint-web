import { UserDatabaseService } from './UserDatabaseService';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import { LoginCredentials, RegisterData, AuthTokens, AuthUser } from '../types/auth';

export class AuthService {
  /**
   * Login user with username/password
   */
  async login(credentials: LoginCredentials, ipAddress: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
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
    UserDatabaseService.run(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
      [user.id]
    );

    // Get user permissions
    const permissions = this.getUserPermissions(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_name,
      permissions,
      themeColor: user.theme_color || 'blue-500',
      surfaceColor: user.surface_color || 'slate-700'
    };

    return { user: authUser, tokens };
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Check if registration is enabled
    const settings = this.getAuthSettings();
    if (!settings.user_registration_enabled) {
      throw new AppError(403, 'User registration is currently disabled');
    }

    // Check if username exists
    const existingUser = UserDatabaseService.get(
      'SELECT id FROM users WHERE username = ?',
      [data.username]
    );
    if (existingUser) {
      throw new AppError(409, 'Username already exists');
    }

    // Check if email exists
    const existingEmail = UserDatabaseService.get(
      'SELECT id FROM users WHERE email = ?',
      [data.email]
    );
    if (existingEmail) {
      throw new AppError(409, 'Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user with default 'user' role (id=2)
    const result = UserDatabaseService.run(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [data.username, data.email, passwordHash, 2]
    );

    const userId = result.lastInsertRowid as number;

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
      surfaceColor: user.surface_color || 'slate-700'
    };

    return { user: authUser, tokens };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    UserDatabaseService.run(
      "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token = ?",
      [refreshToken]
    );
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify token is valid and not revoked
    const tokenRecord = UserDatabaseService.get(
      `SELECT * FROM refresh_tokens
       WHERE token = ? AND revoked_at IS NULL AND expires_at > datetime('now')`,
      [refreshToken]
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
        permissions
      };
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }

  /**
   * Get user permissions
   */
  private getUserPermissions(userId: number): string[] {
    const permissions = UserDatabaseService.all(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ?`,
      [userId]
    );

    return permissions.map(p => p.name);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: any): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role_name
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
      expiresIn: 3600 // 1 hour
    };
  }

  /**
   * Check login attempts and enforce lockout
   */
  private async checkLoginAttempts(username: string, ipAddress: string): Promise<void> {
    const settings = this.getAuthSettings();
    const lockoutDuration = settings.lockout_duration_minutes;
    const maxAttempts = settings.max_login_attempts;

    // Count failed attempts in lockout window
    const failedAttempts = UserDatabaseService.get(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE (username = ? OR ip_address = ?)
       AND success = 0
       AND attempted_at > datetime('now', '-${lockoutDuration} minutes')`,
      [username, ipAddress]
    );

    if (failedAttempts?.count >= maxAttempts) {
      throw new AppError(429, `Too many login attempts. Please try again in ${lockoutDuration} minutes.`);
    }
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(username: string, ipAddress: string, success: boolean): Promise<void> {
    UserDatabaseService.run(
      'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)',
      [username, ipAddress, success ? 1 : 0]
    );

    // Clean up old attempts (older than 24 hours)
    UserDatabaseService.run(
      `DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-24 hours')`
    );
  }

  /**
   * Get auth settings
   */
  private getAuthSettings(): any {
    return UserDatabaseService.get('SELECT * FROM auth_settings WHERE id = 1', []) || {
      guest_access_enabled: 1,
      user_registration_enabled: 1,
      max_login_attempts: 5,
      lockout_duration_minutes: 15
    };
  }

  /**
   * Check if guest access is enabled
   */
  isGuestAccessEnabled(): boolean {
    const settings = this.getAuthSettings();
    return settings.guest_access_enabled === 1;
  }
}
