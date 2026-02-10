import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { persist } from 'zustand/middleware';
import { usersApi } from '@/lib/api';
import { useAuthStore } from './auth';

export type ThemeMode = 'light' | 'dark' | 'system';

export type PrimaryColor =
  | 'blue' // Default
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

export const colorPalette: Record<PrimaryColor, { light: string; dark: string; label: string }> = {
  blue: { light: '221.2 83.2% 53.3%', dark: '217.2 91.2% 59.8%', label: 'Blue' },
  slate: { light: '215.4 16.3% 46.9%', dark: '215.3 25% 56.9%', label: 'Slate' },
  gray: { light: '220 8.9% 46.1%', dark: '220 13% 69%', label: 'Gray' },
  zinc: { light: '240 3.8% 46.1%', dark: '240 5% 65%', label: 'Zinc' },
  neutral: { light: '0 0% 45.1%', dark: '0 0% 65%', label: 'Neutral' },
  stone: { light: '25 5.3% 44.7%', dark: '33.3 5.5% 63.9%', label: 'Stone' },
  red: { light: '0 72.2% 50.6%', dark: '0 72.2% 60.6%', label: 'Red' },
  orange: { light: '24.6 95% 53.1%', dark: '20.5 90.2% 58.2%', label: 'Orange' },
  amber: { light: '37.7 92.1% 50.2%', dark: '32.1 94.6% 58%', label: 'Amber' },
  yellow: { light: '45 93.4% 47.5%', dark: '47.9 95.8% 58.1%', label: 'Yellow' },
  lime: { light: '84 81% 44.3%', dark: '82.7 85% 55.1%', label: 'Lime' },
  green: { light: '142.1 70.6% 45.3%', dark: '142.1 76.2% 56.2%', label: 'Green' },
  emerald: { light: '160.1 84.1% 39.4%', dark: '160.1 84.1% 49.4%', label: 'Emerald' },
  teal: { light: '173.4 80.4% 40%', dark: '172.5 66% 50.4%', label: 'Teal' },
  cyan: { light: '188.7 85.7% 53.3%', dark: '187.2 85.7% 53.3%', label: 'Cyan' },
  sky: { light: '199.3 89.1% 48.2%', dark: '198.6 88.7% 58.4%', label: 'Sky' },
  indigo: { light: '238.7 83.5% 66.7%', dark: '239.4 84.1% 76.7%', label: 'Indigo' },
  violet: { light: '262.1 83.3% 57.8%', dark: '262.1 83.3% 67.8%', label: 'Violet' },
  purple: { light: '258.3 89.5% 58.4%', dark: '258.3 89.5% 68.4%', label: 'Purple' },
  fuchsia: { light: '292.2 84.1% 60.6%', dark: '292.2 84.1% 70.6%', label: 'Fuchsia' },
  pink: { light: '330.4 81.2% 60.4%', dark: '330.4 81.2% 70.4%', label: 'Pink' },
  rose: { light: '346.8 77.2% 49.8%', dark: '346.8 77.2% 59.8%', label: 'Rose' },
};

interface ThemeState {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  isLoading: boolean;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  loadThemeFromServer: () => Promise<void>;
  syncThemeToServer: () => Promise<void>;
}

export const resolveActualMode = (mode: ThemeMode): 'light' | 'dark' =>
  mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : mode;

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolveActualMode(mode));
};

const applyPrimaryColor = (color: PrimaryColor, currentMode: ThemeMode) => {
  const root = document.documentElement;
  const actualTheme = resolveActualMode(currentMode);

  const colorValue = colorPalette[color][actualTheme];

  root.style.setProperty('--primary', colorValue);
  root.style.setProperty('--ring', colorValue);

  const [hue, saturation, lightness] = colorValue.split(' ').map((v) => parseFloat(v));

  const scrollbarLightness =
    actualTheme === 'light'
      ? Math.max(lightness - 15, 30) // Darker in light mode (min 30%)
      : Math.min(lightness + 10, 70); // Lighter in dark mode (max 70%)

  const scrollbarThumb = `${hue} ${saturation}% ${scrollbarLightness}%`;
  const scrollbarThumbHover = colorValue;

  root.style.setProperty('--scrollbar-thumb', scrollbarThumb);
  root.style.setProperty('--scrollbar-thumb-hover', scrollbarThumbHover);
};

const maybeSyncToServer = (get: () => ThemeState) => {
  const authState = useAuthStore.getState();
  if (authState.isAuthenticated && !authState.isGuest) {
    get()
      .syncThemeToServer()
      .catch((error) => {
        logger.debug('Theme sync to server failed:', error);
      });
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      primaryColor: 'blue',
      isLoading: false,

      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
        applyPrimaryColor(get().primaryColor, mode);
        maybeSyncToServer(get);
      },

      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        applyPrimaryColor(color, get().mode);
        maybeSyncToServer(get);
      },

      loadThemeFromServer: async () => {
        try {
          set({ isLoading: true });
          const settings = await usersApi.getThemeSettings();

          // Validate mode against known values
          const validModes: ThemeMode[] = ['light', 'dark', 'system'];
          const mode = validModes.includes(settings.mode as ThemeMode)
            ? (settings.mode as ThemeMode)
            : 'dark';

          // Validate primary color against known palette
          const validColors = Object.keys(colorPalette) as PrimaryColor[];
          const primaryColor = validColors.includes(settings.primaryColor as PrimaryColor)
            ? (settings.primaryColor as PrimaryColor)
            : 'blue';

          set({ mode, primaryColor, isLoading: false });

          applyTheme(mode);
          applyPrimaryColor(primaryColor, mode);
        } catch (error) {
          logger.error('Failed to load theme from server:', error);
          set({ isLoading: false });
        }
      },

      syncThemeToServer: async () => {
        try {
          const { mode, primaryColor } = get();
          await usersApi.updateThemeSettings(mode, primaryColor);
        } catch (error) {
          // Silent fail - user might not be authenticated
          logger.debug('Theme sync to server failed:', error);
        }
      },
    }),
    {
      name: 'flashpoint-theme-settings',
      partialize: (state) => ({
        mode: state.mode,
        primaryColor: state.primaryColor,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.mode);
          applyPrimaryColor(state.primaryColor, state.mode);

          const authState = useAuthStore.getState();
          if (authState.isAuthenticated && !authState.isGuest) {
            state.loadThemeFromServer().catch((error) => {
              logger.debug('Failed to load theme from server on rehydration:', error);
            });
          }
        }
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      applyTheme('system');
      applyPrimaryColor(state.primaryColor, 'system');
    }
  });

  const initialState = useThemeStore.getState();
  applyTheme(initialState.mode);
  applyPrimaryColor(initialState.primaryColor, initialState.mode);
}
