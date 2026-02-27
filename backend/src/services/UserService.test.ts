import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { createTestDatabase, createTestUser } from '../test/helpers';
import { UserService } from './UserService';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('./AuthService', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('./PermissionCache', () => ({
  PermissionCache: {
    invalidateUser: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { UserDatabaseService } from './UserDatabaseService';

describe('UserService', () => {
  let db: BetterSqlite3.Database;
  let userService: UserService;

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

    userService = new UserService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return empty list when no users', async () => {
      const result = await userService.getUsers();

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should return users with pagination', async () => {
      createTestUser(db, { username: 'user1', email: 'user1@test.com' });
      createTestUser(db, { username: 'user2', email: 'user2@test.com' });

      const result = await userService.getUsers(1, 10);

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should respect limit parameter', async () => {
      createTestUser(db, { username: 'user1', email: 'user1@test.com' });
      createTestUser(db, { username: 'user2', email: 'user2@test.com' });
      createTestUser(db, { username: 'user3', email: 'user3@test.com' });

      const result = await userService.getUsers(1, 2);

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(3);
    });

    it('should include user properties', async () => {
      createTestUser(db);

      const result = await userService.getUsers();

      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('username');
      expect(result.data[0]).toHaveProperty('email');
      expect(result.data[0]).toHaveProperty('roleName');
      expect(result.data[0]).toHaveProperty('isActive');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const testUser = createTestUser(db);

      const result = await userService.getUserById(testUser.id);

      expect(result).toBeDefined();
      expect(result?.username).toBe('testuser');
    });

    it('should return null for non-existent user', async () => {
      const result = await userService.getUserById(999);

      expect(result).toBeNull();
    });

    it('should convert isActive to boolean', async () => {
      createTestUser(db, { is_active: true });

      const result = await userService.getUserById(1);

      expect(typeof result?.isActive).toBe('boolean');
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const result = await userService.createUser({
        username: 'newuser',
        email: 'new@test.com',
        password: 'password123',
        roleId: 2,
      });

      expect(result).toBeDefined();
      expect(result.username).toBe('newuser');
      expect(result.email).toBe('new@test.com');
    });

    it('should throw error for duplicate username', async () => {
      createTestUser(db, { username: 'existing' });

      await expect(
        userService.createUser({
          username: 'existing',
          email: 'different@test.com',
          password: 'password',
          roleId: 2,
        })
      ).rejects.toThrow('Username already exists');
    });

    it('should throw error for duplicate email', async () => {
      createTestUser(db, { email: 'existing@test.com' });

      await expect(
        userService.createUser({
          username: 'different',
          email: 'existing@test.com',
          password: 'password',
          roleId: 2,
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should hash the password', async () => {
      await userService.createUser({
        username: 'newuser',
        email: 'new@test.com',
        password: 'plaintext',
        roleId: 2,
      });

      const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('newuser') as {
        password_hash: string;
      };

      expect(user.password_hash).not.toBe('plaintext');
      expect(user.password_hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('updateUser', () => {
    it('should update user email', async () => {
      const testUser = createTestUser(db);

      const result = await userService.updateUser(testUser.id, { email: 'newemail@test.com' });

      expect(result.email).toBe('newemail@test.com');
    });

    it('should update user role', async () => {
      const testUser = createTestUser(db, { role_id: 2 });

      const result = await userService.updateUser(testUser.id, { roleId: 1 });

      expect(result.roleId).toBe(1);
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.updateUser(999, { email: 'test@test.com' })).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error for duplicate email', async () => {
      createTestUser(db, { username: 'user1', email: 'user1@test.com' });
      const user2 = createTestUser(db, { username: 'user2', email: 'user2@test.com' });

      await expect(userService.updateUser(user2.id, { email: 'user1@test.com' })).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should return unchanged user when no updates provided', async () => {
      const testUser = createTestUser(db);

      const result = await userService.updateUser(testUser.id, {});

      expect(result.username).toBe('testuser');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const testUser = createTestUser(db);

      await userService.deleteUser(testUser.id);

      const result = await userService.getUserById(testUser.id);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.deleteUser(999)).rejects.toThrow('User not found');
    });

    it('should prevent deleting last admin', async () => {
      // Create admin user
      const adminUser = createTestUser(db, { username: 'admin', email: 'admin@test.com', role_id: 1 });

      await expect(userService.deleteUser(adminUser.id)).rejects.toThrow(
        'Cannot delete the last admin user'
      );
    });

    it('should allow deleting admin if other admins exist', async () => {
      const admin1 = createTestUser(db, { username: 'admin1', email: 'admin1@test.com', role_id: 1 });
      createTestUser(db, { username: 'admin2', email: 'admin2@test.com', role_id: 1 });

      await expect(userService.deleteUser(admin1.id)).resolves.not.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      // Create user with known password
      await userService.createUser({
        username: 'passuser',
        email: 'pass@test.com',
        password: 'oldpassword',
        roleId: 2,
      });

      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('passuser') as {
        id: number;
      };

      await expect(
        userService.changePassword(user.id, 'oldpassword', 'newpassword')
      ).resolves.not.toThrow();
    });

    it('should throw error for incorrect current password', async () => {
      await userService.createUser({
        username: 'passuser',
        email: 'pass@test.com',
        password: 'correctpassword',
        roleId: 2,
      });

      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('passuser') as {
        id: number;
      };

      await expect(
        userService.changePassword(user.id, 'wrongpassword', 'newpassword')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.changePassword(999, 'old', 'new')).rejects.toThrow('User not found');
    });

    it('should allow admin reset without current password', async () => {
      await userService.createUser({
        username: 'passuser',
        email: 'pass@test.com',
        password: 'anypassword',
        roleId: 2,
      });

      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('passuser') as {
        id: number;
      };

      // Admin reset - any current password should work with isAdminReset=true
      await expect(
        userService.changePassword(user.id, 'doesntmatter', 'newpassword', true)
      ).resolves.not.toThrow();
    });
  });

  describe('getUserSettings', () => {
    it('should return empty object for user with no settings', async () => {
      const testUser = createTestUser(db);

      const result = await userService.getUserSettings(testUser.id);

      expect(result).toEqual({});
    });

    it('should return all user settings', async () => {
      const testUser = createTestUser(db);
      db.prepare(
        'INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)'
      ).run(testUser.id, 'theme_mode', 'dark');
      db.prepare(
        'INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)'
      ).run(testUser.id, 'primary_color', 'blue');

      const result = await userService.getUserSettings(testUser.id);

      expect(result).toEqual({
        theme_mode: 'dark',
        primary_color: 'blue',
      });
    });
  });

  describe('setUserSetting', () => {
    it('should set a new setting', async () => {
      const testUser = createTestUser(db);

      await userService.setUserSetting(testUser.id, 'custom_key', 'custom_value');

      const result = await userService.getUserSetting(testUser.id, 'custom_key');
      expect(result).toBe('custom_value');
    });

    it('should update existing setting', async () => {
      const testUser = createTestUser(db);
      await userService.setUserSetting(testUser.id, 'key', 'old_value');

      await userService.setUserSetting(testUser.id, 'key', 'new_value');

      const result = await userService.getUserSetting(testUser.id, 'key');
      expect(result).toBe('new_value');
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.setUserSetting(999, 'key', 'value')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('getThemeSettings', () => {
    it('should return default values when no settings exist', async () => {
      const testUser = createTestUser(db);

      const result = await userService.getThemeSettings(testUser.id);

      expect(result.mode).toBe('dark');
      expect(result.primaryColor).toBe('blue');
    });

    it('should return stored theme settings', async () => {
      const testUser = createTestUser(db);
      await userService.setUserSetting(testUser.id, 'theme_mode', 'light');
      await userService.setUserSetting(testUser.id, 'primary_color', 'green');

      const result = await userService.getThemeSettings(testUser.id);

      expect(result.mode).toBe('light');
      expect(result.primaryColor).toBe('green');
    });
  });

  describe('updateThemeSettings', () => {
    it('should update both mode and primary color', async () => {
      const testUser = createTestUser(db);

      await userService.updateThemeSettings(testUser.id, 'light', 'red');

      const result = await userService.getThemeSettings(testUser.id);
      expect(result.mode).toBe('light');
      expect(result.primaryColor).toBe('red');
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.updateThemeSettings(999, 'dark', 'blue')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
