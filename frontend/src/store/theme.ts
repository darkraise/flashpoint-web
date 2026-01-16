import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Apply theme to document
const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark');

  // Determine actual theme to apply
  const actualTheme: 'light' | 'dark' = mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : mode;

  // Apply theme class
  root.classList.add(actualTheme);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',

      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      }
    }),
    {
      name: 'flashpoint-theme-settings',
      partialize: (state) => ({
        mode: state.mode
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme after rehydration
        if (state) {
          applyTheme(state.mode);
        }
      }
    }
  )
);

// Listen for system theme changes when in system mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      applyTheme('system');
    }
  });

  // Apply initial theme
  const initialState = useThemeStore.getState();
  applyTheme(initialState.mode);
}
