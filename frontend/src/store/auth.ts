import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/auth';
import { useThemeStore } from './theme';
import { logger } from '@/lib/logger';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isMaintenanceMode: boolean;

  setAuth: (user: User) => void;
  setGuestMode: () => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
  setMaintenanceMode: (isActive: boolean) => void;

  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isMaintenanceMode: false,

      setAuth: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isGuest: false,
        });

        if (user.role !== 'guest') {
          const themeStore = useThemeStore.getState();
          themeStore.loadThemeFromServer().catch((error) => {
            logger.debug('Failed to load theme settings after login:', error);
          });
        }
      },

      setGuestMode: () => {
        const guestUser: User = {
          id: 0,
          username: 'Guest',
          email: 'guest@flashpoint.local',
          role: 'guest',
          permissions: ['games.read', 'playlists.read'],
        };
        set({
          user: guestUser,
          isAuthenticated: false,
          isGuest: true,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      setMaintenanceMode: (isActive: boolean) => {
        set({ isMaintenanceMode: isActive });
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes(permission);
      },

      hasRole: (role: string) => {
        const { user } = get();
        if (!user) return false;
        return user.role === role;
      },

      hasAnyPermission: (permissions: string[]) => {
        const { user } = get();
        if (!user) return false;
        return permissions.some((permission) => user.permissions.includes(permission));
      },

      hasAllPermissions: (permissions: string[]) => {
        const { user } = get();
        if (!user) return false;
        return permissions.every((permission) => user.permissions.includes(permission));
      },
    }),
    {
      name: 'flashpoint-auth',
      // Guest sessions → sessionStorage (tab-scoped); authenticated → localStorage (persistent)
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const sessionValue = sessionStorage.getItem(name);
          if (sessionValue) {
            try {
              const parsed = JSON.parse(sessionValue);
              if (parsed?.state?.isGuest) {
                return sessionValue;
              }
            } catch {
              // Invalid JSON, ignore
            }
          }
          return localStorage.getItem(name);
        },
        setItem: (name, value) => {
          try {
            const parsed = JSON.parse(value);
            if (parsed?.state?.isGuest) {
              sessionStorage.setItem(name, value);
            } else {
              localStorage.setItem(name, value);
              sessionStorage.removeItem(name);
            }
          } catch {
            localStorage.setItem(name, value);
          }
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
          sessionStorage.removeItem(name);
        },
      })),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        isMaintenanceMode: state.isMaintenanceMode,
      }),
    }
  )
);
