import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { createTestDatabase, createTestUser } from '../test/helpers';
import { AuthService } from './AuthService';
import { hashPassword } from '../utils/password';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('./SystemSettingsService', () => ({
  SystemSettingsService: vi.fn().mockImplementation(() => ({
    getCategory: vi.fn().mockReturnValue({
      guestAccessEnabled: true,
      userRegistrationEnabled: true,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
    }),
  })),
}));

vi.mock('./CachedSystemSettingsService', () => ({
  CachedSystemSettingsService: {
    getInstance: vi.fn().mockReturnValue({
      getCategory: vi.fn().mockReturnValue({
        defaultTheme: 'dark',
        defaultPrimaryColor: 'blue',
      }),
    }),
  },
}));

vi.mock('./PermissionCache', () => ({
  PermissionCache: {
    getUserPermissions: vi.fn().mockReturnValue(null),
    setUserPermissions: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing-purposes',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 10,
  },
}));

import { UserDatabaseService } from './UserDatabaseService';
import { SystemSettingsService } from './SystemSettingsService';

describe('AuthService', () => {
  let db: BetterSqlite3.Database;
  let authService: AuthService;

  beforeEach(() => {
    db = createTestDatabase();
    vi.mocked(UserDatabaseService.getDatabase).mockReturnValue(db);

    // Mock static methods to use test database
    vi.mocked(UserDatabaseService.all).mockImplementation((query, params) => {
      return db.prepare(query).all(...(params ?? []));
    });
    vi.mocked(UserDatabaseService.get).mockImplementation((query, params) => {
      return db.prepare(query).get(...(params ?? []));
    });
    vi.mocked(UserDatabaseService.run).mockImplementation((query, params) => {
      return db.prepare(query).run(...(params ?? []));
    });

    authService = new AuthService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const passwordHash = await hashPassword('correctpassword');
      createTestUser(db, {
        username: 'loginuser',
        email: 'login@test.com',
        password_hash: passwordHash,
        role_id: 2,
      });

      const result = await authService.login(
        { username: 'loginuser', password: 'correctpassword' },
        '127.0.0.1'
      );

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('loginuser');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should return user permissions on login', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'permuser',
        email: 'perm@test.com',
        password_hash: passwordHash,
        role_id: 2,
      });

      const result = await authService.login(
        { username: 'permuser', password: 'password' },
        '127.0.0.1'
      );

      expect(result.user.permissions).toBeDefined();
      expect(Array.isArray(result.user.permissions)).toBe(true);
    });

    it('should throw error for invalid username', async () => {
      await expect(
        authService.login({ username: 'nonexistent', password: 'anypassword' }, '127.0.0.1')
      ).rejects.toThrow('Invalid username or password');
    });

    it('should throw error for invalid password', async () => {
      const passwordHash = await hashPassword('correctpassword');
      createTestUser(db, {
        username: 'wrongpassuser',
        email: 'wrongpass@test.com',
        password_hash: passwordHash,
      });

      await expect(
        authService.login({ username: 'wrongpassuser', password: 'wrongpassword' }, '127.0.0.1')
      ).rejects.toThrow('Invalid username or password');
    });

    it('should throw error for inactive user', async () => {
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'inactiveuser',
        email: 'inactive@test.com',
        password_hash: passwordHash,
        is_active: false,
      });

      await expect(
        authService.login({ username: 'inactiveuser', password: 'password' }, '127.0.0.1')
      ).rejects.toThrow('Invalid username or password');
    });

    it('should record failed login attempt', async () => {
      await expect(
        authService.login({ username: 'nonexistent', password: 'anypassword' }, '127.0.0.1')
      ).rejects.toThrow();

      const attempts = db
        .prepare('SELECT * FROM login_attempts WHERE username = ?')
        .all('nonexistent') as { success: number }[];

      expect(attempts.length).toBe(1);
      expect(attempts[0].success).toBe(0);
    });

    it('should record successful login attempt', async () => {
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'successuser',
        email: 'success@test.com',
        password_hash: passwordHash,
      });

      await authService.login({ username: 'successuser', password: 'password' }, '127.0.0.1');

      const attempts = db
        .prepare('SELECT * FROM login_attempts WHERE username = ?')
        .all('successuser') as { success: number }[];

      expect(attempts.length).toBe(1);
      expect(attempts[0].success).toBe(1);
    });

    it('should update last_login_at on successful login', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'lastloginuser',
        email: 'lastlogin@test.com',
        password_hash: passwordHash,
      });

      await authService.login({ username: 'lastloginuser', password: 'password' }, '127.0.0.1');

      const updatedUser = db.prepare('SELECT last_login_at FROM users WHERE id = ?').get(user.id) as {
        last_login_at: string;
      };

      expect(updatedUser.last_login_at).toBeDefined();
    });

    it('should lockout after max failed attempts', async () => {
      // Create user but we'll fail login attempts
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'lockoutuser',
        email: 'lockout@test.com',
        password_hash: passwordHash,
      });

      // Insert 5 failed attempts directly
      for (let i = 0; i < 5; i++) {
        db.prepare(
          'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)'
        ).run('lockoutuser', '127.0.0.1', 0);
      }

      await expect(
        authService.login({ username: 'lockoutuser', password: 'password' }, '127.0.0.1')
      ).rejects.toThrow('Too many login attempts');
    });

    it('should lockout based on IP address', async () => {
      // Insert failed attempts for different usernames but same IP
      for (let i = 0; i < 5; i++) {
        db.prepare(
          'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)'
        ).run(`user${i}`, '192.168.1.1', 0);
      }

      await expect(
        authService.login({ username: 'newuser', password: 'password' }, '192.168.1.1')
      ).rejects.toThrow('Too many login attempts');
    });

    it('should store refresh token in database', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'tokenuser',
        email: 'token@test.com',
        password_hash: passwordHash,
      });

      const result = await authService.login(
        { username: 'tokenuser', password: 'password' },
        '127.0.0.1'
      );

      const tokens = db
        .prepare('SELECT * FROM refresh_tokens WHERE user_id = ?')
        .all(user.id) as { token: string }[];

      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBe(result.tokens.refreshToken);
    });
  });

  describe('register', () => {
    it('should register first user as admin', async () => {
      const result = await authService.register({
        username: 'firstadmin',
        email: 'admin@test.com',
        password: 'adminpassword',
      });

      expect(result.user.role).toBe('admin');
    });

    it('should register subsequent users with user role', async () => {
      // Create first user (admin)
      await authService.register({
        username: 'firstuser',
        email: 'first@test.com',
        password: 'password',
      });

      // Register second user
      const result = await authService.register({
        username: 'seconduser',
        email: 'second@test.com',
        password: 'password',
      });

      expect(result.user.role).toBe('user');
    });

    it('should return tokens on registration', async () => {
      const result = await authService.register({
        username: 'newuser',
        email: 'new@test.com',
        password: 'password',
      });

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.expiresIn).toBe(3600);
    });

    it('should throw error for duplicate username', async () => {
      await authService.register({
        username: 'duplicate',
        email: 'first@test.com',
        password: 'password',
      });

      await expect(
        authService.register({
          username: 'duplicate',
          email: 'second@test.com',
          password: 'password',
        })
      ).rejects.toThrow('An account with that username or email already exists');
    });

    it('should throw error for duplicate email', async () => {
      await authService.register({
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'password',
      });

      await expect(
        authService.register({
          username: 'user2',
          email: 'duplicate@test.com',
          password: 'password',
        })
      ).rejects.toThrow('An account with that username or email already exists');
    });

    it('should throw error when registration is disabled', async () => {
      // Create first user (admin) - this bypasses the registration check
      await authService.register({
        username: 'admin',
        email: 'admin@test.com',
        password: 'password',
      });

      // Mock registration disabled
      vi.mocked(SystemSettingsService).mockImplementation(
        () =>
          ({
            getCategory: vi.fn().mockReturnValue({
              userRegistrationEnabled: false,
              maxLoginAttempts: 5,
              lockoutDurationMinutes: 15,
            }),
          }) as unknown as SystemSettingsService
      );

      // Create new AuthService with mocked settings
      const restrictedAuthService = new AuthService();

      await expect(
        restrictedAuthService.register({
          username: 'newuser',
          email: 'new@test.com',
          password: 'password',
        })
      ).rejects.toThrow('User registration is currently disabled');
    });

    it('should hash password before storing', async () => {
      await authService.register({
        username: 'hashuser',
        email: 'hash@test.com',
        password: 'plaintextpassword',
      });

      const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('hashuser') as {
        password_hash: string;
      };

      expect(user.password_hash).not.toBe('plaintextpassword');
      expect(user.password_hash).toMatch(/^\$2[ab]\$/);
    });

    it('should create default user settings on registration', async () => {
      const result = await authService.register({
        username: 'settingsuser',
        email: 'settings@test.com',
        password: 'password',
      });

      const settings = db
        .prepare('SELECT * FROM user_settings WHERE user_id = ?')
        .all(result.user.id) as { setting_key: string; setting_value: string }[];

      const settingsMap = new Map(settings.map((s) => [s.setting_key, s.setting_value]));

      expect(settingsMap.get('theme_mode')).toBe('dark');
      expect(settingsMap.get('primary_color')).toBe('blue');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'logoutuser',
        email: 'logout@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'logoutuser', password: 'password' },
        '127.0.0.1'
      );

      await authService.logout(loginResult.tokens.refreshToken);

      const token = db
        .prepare('SELECT revoked_at FROM refresh_tokens WHERE token = ?')
        .get(loginResult.tokens.refreshToken) as { revoked_at: string | null };

      expect(token.revoked_at).not.toBeNull();
    });

    it('should not throw for non-existent token', async () => {
      await expect(authService.logout('non-existent-token')).resolves.not.toThrow();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'revokeuser',
        email: 'revoke@test.com',
        password_hash: passwordHash,
      });

      // Create multiple tokens
      await authService.login({ username: 'revokeuser', password: 'password' }, '127.0.0.1');
      await authService.login({ username: 'revokeuser', password: 'password' }, '127.0.0.1');

      await authService.revokeAllUserTokens(user.id);

      const tokens = db
        .prepare('SELECT revoked_at FROM refresh_tokens WHERE user_id = ?')
        .all(user.id) as { revoked_at: string | null }[];

      expect(tokens.length).toBe(2);
      tokens.forEach((token) => {
        expect(token.revoked_at).not.toBeNull();
      });
    });

    it('should not affect other users tokens', async () => {
      const passwordHash = await hashPassword('password');
      const user1 = createTestUser(db, {
        username: 'user1',
        email: 'user1@test.com',
        password_hash: passwordHash,
      });
      const user2 = createTestUser(db, {
        username: 'user2',
        email: 'user2@test.com',
        password_hash: passwordHash,
      });

      await authService.login({ username: 'user1', password: 'password' }, '127.0.0.1');
      await authService.login({ username: 'user2', password: 'password' }, '127.0.0.1');

      await authService.revokeAllUserTokens(user1.id);

      const user2Tokens = db
        .prepare('SELECT revoked_at FROM refresh_tokens WHERE user_id = ?')
        .all(user2.id) as { revoked_at: string | null }[];

      expect(user2Tokens[0].revoked_at).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'refreshuser',
        email: 'refresh@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'refreshuser', password: 'password' },
        '127.0.0.1'
      );

      const newTokens = await authService.refreshToken(loginResult.tokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(loginResult.tokens.refreshToken);
    });

    it('should revoke old refresh token after use', async () => {
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'oldtokenuser',
        email: 'oldtoken@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'oldtokenuser', password: 'password' },
        '127.0.0.1'
      );

      await authService.refreshToken(loginResult.tokens.refreshToken);

      const oldToken = db
        .prepare('SELECT revoked_at FROM refresh_tokens WHERE token = ?')
        .get(loginResult.tokens.refreshToken) as { revoked_at: string | null };

      expect(oldToken.revoked_at).not.toBeNull();
    });

    it('should throw error for revoked refresh token', async () => {
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'revokeduser',
        email: 'revoked@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'revokeduser', password: 'password' },
        '127.0.0.1'
      );

      // Revoke the token
      await authService.logout(loginResult.tokens.refreshToken);

      await expect(authService.refreshToken(loginResult.tokens.refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw error for expired refresh token', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'expireduser',
        email: 'expired@test.com',
        password_hash: passwordHash,
      });

      // Insert an expired token
      const expiredToken = 'expired-token-12345';
      db.prepare(
        `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '-1 day'))`
      ).run(user.id, expiredToken);

      await expect(authService.refreshToken(expiredToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw error for non-existent refresh token', async () => {
      await expect(authService.refreshToken('non-existent-token')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw error if user is inactive', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'inactiverefresh',
        email: 'inactiverefresh@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'inactiverefresh', password: 'password' },
        '127.0.0.1'
      );

      // Deactivate user
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(user.id);

      await expect(authService.refreshToken(loginResult.tokens.refreshToken)).rejects.toThrow(
        'User not found or inactive'
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should return user for valid token', async () => {
      const passwordHash = await hashPassword('password');
      createTestUser(db, {
        username: 'verifyuser',
        email: 'verify@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'verifyuser', password: 'password' },
        '127.0.0.1'
      );

      const user = await authService.verifyAccessToken(loginResult.tokens.accessToken);

      expect(user.username).toBe('verifyuser');
      expect(user.permissions).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.verifyAccessToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error for inactive user', async () => {
      const passwordHash = await hashPassword('password');
      const user = createTestUser(db, {
        username: 'inactiveverify',
        email: 'inactiveverify@test.com',
        password_hash: passwordHash,
      });

      const loginResult = await authService.login(
        { username: 'inactiveverify', password: 'password' },
        '127.0.0.1'
      );

      // Deactivate user
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(user.id);

      await expect(authService.verifyAccessToken(loginResult.tokens.accessToken)).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('cleanupOldLoginAttempts', () => {
    it('should delete attempts older than 24 hours', async () => {
      // Insert old attempt
      db.prepare(
        `INSERT INTO login_attempts (username, ip_address, success, attempted_at)
         VALUES (?, ?, ?, datetime('now', '-25 hours'))`
      ).run('olduser', '127.0.0.1', 0);

      // Insert recent attempt
      db.prepare(
        `INSERT INTO login_attempts (username, ip_address, success, attempted_at)
         VALUES (?, ?, ?, datetime('now', '-1 hour'))`
      ).run('recentuser', '127.0.0.1', 0);

      await authService.cleanupOldLoginAttempts();

      const attempts = db.prepare('SELECT * FROM login_attempts').all() as { username: string }[];

      expect(attempts.length).toBe(1);
      expect(attempts[0].username).toBe('recentuser');
    });

    it('should not throw when no attempts to clean', async () => {
      await expect(authService.cleanupOldLoginAttempts()).resolves.not.toThrow();
    });
  });

  describe('isGuestAccessEnabled', () => {
    it('should return true when guest access is enabled', () => {
      const result = authService.isGuestAccessEnabled();

      expect(result).toBe(true);
    });

    it('should return false when guest access is disabled', () => {
      vi.mocked(SystemSettingsService).mockImplementation(
        () =>
          ({
            getCategory: vi.fn().mockReturnValue({
              guestAccessEnabled: false,
              userRegistrationEnabled: true,
              maxLoginAttempts: 5,
              lockoutDurationMinutes: 15,
            }),
          }) as unknown as SystemSettingsService
      );

      const restrictedAuthService = new AuthService();
      const result = restrictedAuthService.isGuestAccessEnabled();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should use default settings when settings service fails', () => {
      vi.mocked(SystemSettingsService).mockImplementation(
        () =>
          ({
            getCategory: vi.fn().mockImplementation(() => {
              throw new Error('Settings service error');
            }),
          }) as unknown as SystemSettingsService
      );

      const errorAuthService = new AuthService();

      // Should not throw and return default (true)
      expect(errorAuthService.isGuestAccessEnabled()).toBe(true);
    });
  });
});
