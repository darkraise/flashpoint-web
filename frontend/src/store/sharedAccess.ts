import { create } from 'zustand';

interface SharedAccessState {
  token: string | null;
  shareToken: string | null;
  playlistId: number | null;
  expiresAt: number | null;

  setToken: (token: string, shareToken: string, playlistId: number, expiresIn: number) => void;
  clearToken: () => void;
  isValid: () => boolean;
  getToken: () => string | null;
}

const STORAGE_KEY = 'shared_access_token';

const loadFromSession = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.expiresAt && data.expiresAt > Date.now()) {
        return data;
      }
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return { token: null, shareToken: null, playlistId: null, expiresAt: null };
};

export const useSharedAccessStore = create<SharedAccessState>((set, get) => ({
  ...loadFromSession(),

  setToken: (token, shareToken, playlistId, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    const data = { token, shareToken, playlistId, expiresAt };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    set(data);
  },

  clearToken: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({ token: null, shareToken: null, playlistId: null, expiresAt: null });
  },

  isValid: () => {
    const { token, expiresAt } = get();
    return !!(token && expiresAt && expiresAt > Date.now());
  },

  getToken: () => {
    const { token, expiresAt } = get();
    if (token && expiresAt && expiresAt > Date.now()) {
      return token;
    }
    return null;
  },
}));
