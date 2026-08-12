import { create } from 'zustand';

interface ServerStatusState {
  /** True while the backend answers requests with "still starting". */
  isStarting: boolean;
  /** What the backend reported it was doing, e.g. "Warming up game search". */
  phase: string | null;

  /** Cleared only by the reload the starting screen performs once ready. */
  setStarting: (phase: string | null) => void;
}

export const useServerStatusStore = create<ServerStatusState>((set) => ({
  isStarting: false,
  phase: null,

  setStarting: (phase) => set({ isStarting: true, phase }),
}));
