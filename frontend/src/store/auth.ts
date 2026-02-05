import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens } from '../types/auth';
import { useThemeStore } from './theme';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isMaintenanceMode: boolean;

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  setGuestMode: () => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
  updateUser: (user: User) => void;
  setMaintenanceMode: (isActive: boolean) => void;

  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isGuest: false,
      isMaintenanceMode: false,

      setAuth: (user: User, tokens: AuthTokens) => {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isGuest: false,
        });

        // Load theme settings from server after successful login (not guest)
        if (user.role !== 'guest') {
          const themeStore = useThemeStore.getState();
          themeStore.loadThemeFromServer().catch((error) => {
            console.debug('Failed to load theme settings after login:', error);
          });
        }
      },

      setGuestMode: () => {
        // Create a temporary guest user with limited permissions
        const guestUser: User = {
          id: 0,
          username: 'Guest',
          email: 'guest@flashpoint.local',
          role: 'guest',
          permissions: ['games.read', 'playlists.read', 'games.play'],
        };
        set({
          user: guestUser,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuest: true,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuest: false,
        });
      },

      updateAccessToken: (token: string) => {
        set({ accessToken: token });
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
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          // For guest users, use sessionStorage; for authenticated users, use localStorage
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
              // Guest sessions go to sessionStorage only
              sessionStorage.setItem(name, value);
            } else {
              // Authenticated sessions go to localStorage
              localStorage.setItem(name, value);
              // Clear any guest session from sessionStorage
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
    }
  )
);
