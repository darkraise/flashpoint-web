import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './auth';
import type { User } from '@/types/auth';

describe('Auth Store', () => {
  // Clear store and storage before each test
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    localStorage.clear();
    sessionStorage.clear();
  });

  // Clean up after each test
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isGuest).toBe(false);
      expect(state.isMaintenanceMode).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('should set authenticated user', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play', 'playlists.create'],
      };

      useAuthStore.getState().setAuth(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isGuest).toBe(false);
    });

    it('should persist auth to localStorage for authenticated users', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play'],
      };

      useAuthStore.getState().setAuth(mockUser);

      // Check that localStorage was updated
      const stored = localStorage.getItem('flashpoint-auth');
      expect(stored).not.toBeNull();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.user).toEqual(mockUser);
        expect(parsed.state.isAuthenticated).toBe(true);
      }
    });
  });

  describe('setGuestMode', () => {
    it('should set guest user with limited permissions', () => {
      useAuthStore.getState().setGuestMode();

      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.user?.role).toBe('guest');
      expect(state.user?.username).toBe('Guest');
      expect(state.isAuthenticated).toBe(false);
      expect(state.isGuest).toBe(true);
    });

    it('should give guest user specific permissions', () => {
      useAuthStore.getState().setGuestMode();

      const state = useAuthStore.getState();
      expect(state.user?.permissions).toContain('games.read');
      expect(state.user?.permissions).toContain('playlists.read');
    });

    it('should persist guest session to sessionStorage', () => {
      useAuthStore.getState().setGuestMode();

      // Guest should be in sessionStorage, not localStorage
      const sessionStored = sessionStorage.getItem('flashpoint-auth');
      expect(sessionStored).not.toBeNull();

      if (sessionStored) {
        const parsed = JSON.parse(sessionStored);
        expect(parsed.state.isGuest).toBe(true);
      }
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state', () => {
      // First set some auth
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play'],
      };

      useAuthStore.getState().setAuth(mockUser);

      // Now clear
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isGuest).toBe(false);
    });

    it('should remove persisted auth from storage', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
      };

      useAuthStore.getState().setAuth(mockUser);
      expect(localStorage.getItem('flashpoint-auth')).not.toBeNull();

      useAuthStore.getState().clearAuth();

      // Should be cleared from storage
      const stored = localStorage.getItem('flashpoint-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.user).toBeNull();
      }
    });
  });

  describe('updateUser', () => {
    it('should update user information', () => {
      const initialUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play'],
      };

      useAuthStore.getState().setAuth(initialUser);

      const updatedUser: User = {
        ...initialUser,
        email: 'newemail@example.com',
        permissions: ['games.play', 'playlists.create'],
      };

      useAuthStore.getState().updateUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(updatedUser);
    });
  });

  describe('setMaintenanceMode', () => {
    it('should set maintenance mode flag', () => {
      expect(useAuthStore.getState().isMaintenanceMode).toBe(false);

      useAuthStore.getState().setMaintenanceMode(true);
      expect(useAuthStore.getState().isMaintenanceMode).toBe(true);

      useAuthStore.getState().setMaintenanceMode(false);
      expect(useAuthStore.getState().isMaintenanceMode).toBe(false);
    });
  });

  describe('Permission Helpers', () => {
    beforeEach(() => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play', 'playlists.create', 'playlists.update'],
      };

      useAuthStore.getState().setAuth(mockUser);
    });

    describe('hasPermission', () => {
      it('should return true for granted permissions', () => {
        const { hasPermission } = useAuthStore.getState();
        expect(hasPermission('games.play')).toBe(true);
        expect(hasPermission('playlists.create')).toBe(true);
      });

      it('should return false for missing permissions', () => {
        const { hasPermission } = useAuthStore.getState();
        expect(hasPermission('users.manage')).toBe(false);
        expect(hasPermission('settings.update')).toBe(false);
      });

      it('should return false when no user is authenticated', () => {
        useAuthStore.getState().clearAuth();
        const { hasPermission } = useAuthStore.getState();
        expect(hasPermission('games.play')).toBe(false);
      });
    });

    describe('hasRole', () => {
      it('should return true for matching role', () => {
        const { hasRole } = useAuthStore.getState();
        expect(hasRole('user')).toBe(true);
      });

      it('should return false for non-matching role', () => {
        const { hasRole } = useAuthStore.getState();
        expect(hasRole('admin')).toBe(false);
        expect(hasRole('moderator')).toBe(false);
      });

      it('should return false when no user is authenticated', () => {
        useAuthStore.getState().clearAuth();
        const { hasRole } = useAuthStore.getState();
        expect(hasRole('user')).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('should return true if user has at least one permission', () => {
        const { hasAnyPermission } = useAuthStore.getState();
        expect(hasAnyPermission(['games.play', 'users.manage'])).toBe(true);
        expect(hasAnyPermission(['playlists.create', 'settings.update'])).toBe(true);
      });

      it('should return false if user has none of the permissions', () => {
        const { hasAnyPermission } = useAuthStore.getState();
        expect(hasAnyPermission(['users.manage', 'settings.update'])).toBe(false);
      });

      it('should return false when no user is authenticated', () => {
        useAuthStore.getState().clearAuth();
        const { hasAnyPermission } = useAuthStore.getState();
        expect(hasAnyPermission(['games.play'])).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('should return true if user has all permissions', () => {
        const { hasAllPermissions } = useAuthStore.getState();
        expect(hasAllPermissions(['games.play', 'playlists.create'])).toBe(true);
      });

      it('should return false if user is missing any permission', () => {
        const { hasAllPermissions } = useAuthStore.getState();
        expect(hasAllPermissions(['games.play', 'users.manage'])).toBe(false);
      });

      it('should return false when no user is authenticated', () => {
        useAuthStore.getState().clearAuth();
        const { hasAllPermissions } = useAuthStore.getState();
        expect(hasAllPermissions(['games.play'])).toBe(false);
      });
    });
  });
});
