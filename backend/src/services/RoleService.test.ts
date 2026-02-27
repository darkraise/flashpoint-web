import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { createTestDatabase, createTestRole } from '../test/helpers';
import { RoleService } from './RoleService';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('./PermissionCache', () => ({
  PermissionCache: {
    invalidateRole: vi.fn(),
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

describe('RoleService', () => {
  let db: BetterSqlite3.Database;
  let roleService: RoleService;

  beforeEach(() => {
    db = createTestDatabase();
    vi.mocked(UserDatabaseService.getDatabase).mockReturnValue(db);

    // Also mock the static methods to use the test database
    vi.mocked(UserDatabaseService.all).mockImplementation((query, params) => {
      return db.prepare(query).all(...(params ?? []));
    });
    vi.mocked(UserDatabaseService.get).mockImplementation((query, params) => {
      return db.prepare(query).get(...(params ?? []));
    });

    roleService = new RoleService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('getRoles', () => {
    it('should return all system roles', async () => {
      const roles = await roleService.getRoles();

      expect(roles.length).toBeGreaterThanOrEqual(3);
      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('user');
      expect(roleNames).toContain('guest');
    });

    it('should include permissions for each role', async () => {
      const roles = await roleService.getRoles();
      const adminRole = roles.find((r) => r.name === 'admin');

      expect(adminRole).toBeDefined();
      expect(adminRole?.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('getRoleById', () => {
    it('should return role by id', async () => {
      const role = await roleService.getRoleById(1);

      expect(role).toBeDefined();
      expect(role?.name).toBe('admin');
    });

    it('should return null for non-existent role', async () => {
      const role = await roleService.getRoleById(999);

      expect(role).toBeNull();
    });

    it('should include permissions', async () => {
      const role = await roleService.getRoleById(1);

      expect(role?.permissions).toBeDefined();
      expect(role?.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions', async () => {
      const permissions = await roleService.getPermissions();

      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions[0]).toHaveProperty('id');
      expect(permissions[0]).toHaveProperty('name');
      expect(permissions[0]).toHaveProperty('resource');
      expect(permissions[0]).toHaveProperty('action');
    });

    it('should include game permissions', async () => {
      const permissions = await roleService.getPermissions();
      const gamePermissions = permissions.filter((p) => p.resource === 'games');

      expect(gamePermissions.length).toBeGreaterThan(0);
    });
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const role = await roleService.createRole('editor', 'Can edit content');

      expect(role).toBeDefined();
      expect(role.name).toBe('editor');
      expect(role.description).toBe('Can edit content');
    });

    it('should throw error for duplicate name', async () => {
      await roleService.createRole('editor', 'First editor');

      await expect(roleService.createRole('editor', 'Second editor')).rejects.toThrow(
        'Role name already exists'
      );
    });

    it('should assign permissions if provided', async () => {
      // Get permission IDs
      const permissions = await roleService.getPermissions();
      const gamesRead = permissions.find((p) => p.name === 'games.read');

      // Create role with permissions - this will fail because system role check
      // Actually, createRole doesn't check system role. Let's test with real permission IDs
      const role = await roleService.createRole('viewer', 'Can view only', [gamesRead!.id]);

      expect(role.permissions.length).toBe(1);
      expect(role.permissions[0].name).toBe('games.read');
    });
  });

  describe('updateRole', () => {
    it('should update role name', async () => {
      // Create a non-system role first
      const created = await roleService.createRole('editor', 'Can edit');

      const updated = await roleService.updateRole(created.id, 'senior-editor', undefined);

      expect(updated.name).toBe('senior-editor');
    });

    it('should update role description', async () => {
      const created = await roleService.createRole('editor', 'Can edit');

      const updated = await roleService.updateRole(created.id, undefined, 'Updated description');

      expect(updated.description).toBe('Updated description');
    });

    it('should throw error for system roles', async () => {
      await expect(roleService.updateRole(1, 'super-admin')).rejects.toThrow(
        'Cannot modify system roles'
      );
    });

    it('should throw error for non-existent role', async () => {
      await expect(roleService.updateRole(999, 'newname')).rejects.toThrow('Role not found');
    });

    it('should throw error for duplicate name', async () => {
      await roleService.createRole('editor1', 'First');
      const role2 = await roleService.createRole('editor2', 'Second');

      await expect(roleService.updateRole(role2.id, 'editor1')).rejects.toThrow(
        'Role name already exists'
      );
    });
  });

  describe('updateRolePermissions', () => {
    it('should update role permissions', async () => {
      const created = await roleService.createRole('editor', 'Can edit');
      const permissions = await roleService.getPermissions();
      const gamesRead = permissions.find((p) => p.name === 'games.read');

      await roleService.updateRolePermissions(created.id, [gamesRead!.id]);

      const updated = await roleService.getRoleById(created.id);
      expect(updated?.permissions.some((p) => p.name === 'games.read')).toBe(true);
    });

    it('should throw error for system roles', async () => {
      const permissions = await roleService.getPermissions();

      await expect(roleService.updateRolePermissions(1, [permissions[0].id])).rejects.toThrow(
        'Cannot modify system role permissions'
      );
    });

    it('should throw error for non-existent role', async () => {
      await expect(roleService.updateRolePermissions(999, [])).rejects.toThrow('Role not found');
    });

    it('should replace existing permissions', async () => {
      const created = await roleService.createRole('editor', 'Can edit');
      const permissions = await roleService.getPermissions();
      const gamesRead = permissions.find((p) => p.name === 'games.read')!;
      const gamesPlay = permissions.find((p) => p.name === 'games.play')!;

      // Add first permission
      await roleService.updateRolePermissions(created.id, [gamesRead.id]);

      // Replace with second permission
      await roleService.updateRolePermissions(created.id, [gamesPlay.id]);

      const updated = await roleService.getRoleById(created.id);
      expect(updated?.permissions.length).toBe(1);
      expect(updated?.permissions[0].name).toBe('games.play');
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      const created = await roleService.createRole('temporary', 'To be deleted');

      await roleService.deleteRole(created.id);

      const deleted = await roleService.getRoleById(created.id);
      expect(deleted).toBeNull();
    });

    it('should throw error for system roles', async () => {
      await expect(roleService.deleteRole(1)).rejects.toThrow('Cannot delete system roles');
      await expect(roleService.deleteRole(2)).rejects.toThrow('Cannot delete system roles');
      await expect(roleService.deleteRole(3)).rejects.toThrow('Cannot delete system roles');
    });

    it('should throw error for non-existent role', async () => {
      await expect(roleService.deleteRole(999)).rejects.toThrow('Role not found');
    });

    it('should throw error if users are assigned to role', async () => {
      const created = await roleService.createRole('assigned', 'Has users');

      // Create a user with this role
      db.prepare('INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)').run(
        'roleuser',
        'role@test.com',
        'hash',
        created.id
      );

      await expect(roleService.deleteRole(created.id)).rejects.toThrow(
        /Cannot delete role: \d+ users are assigned/
      );
    });
  });

  describe('validatePermissionEscalation', () => {
    it('should not throw for empty permission list', async () => {
      await expect(roleService.validatePermissionEscalation([], ['games.read'])).resolves.not.toThrow();
    });

    it('should not throw when user has all permissions', async () => {
      const permissions = await roleService.getPermissions();
      const gamesRead = permissions.find((p) => p.name === 'games.read')!;

      await expect(
        roleService.validatePermissionEscalation([gamesRead.id], ['games.read', 'games.play'])
      ).resolves.not.toThrow();
    });

    it('should throw when user lacks permissions', async () => {
      const permissions = await roleService.getPermissions();
      const usersCreate = permissions.find((p) => p.name === 'users.create')!;

      await expect(
        roleService.validatePermissionEscalation([usersCreate.id], ['games.read'])
      ).rejects.toThrow('Cannot assign permissions you do not possess');
    });
  });

  describe('getRolesPaginated', () => {
    it('should return paginated roles', async () => {
      const result = await roleService.getRolesPaginated(1, 10);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should respect limit', async () => {
      // Create some extra roles
      await roleService.createRole('role1', 'desc1');
      await roleService.createRole('role2', 'desc2');

      const result = await roleService.getRolesPaginated(1, 2);

      expect(result.data.length).toBeLessThanOrEqual(2);
    });
  });
});
