import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CardSize = 'small' | 'medium' | 'large';
export type ViewMode = 'grid' | 'list';
export type ListColumns = 1 | 2 | 3 | 4;

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  selectedGameId: string | null;
  cardSize: CardSize;
  listColumns: ListColumns;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedGame: (id: string | null) => void;
  setCardSize: (size: CardSize) => void;
  setListColumns: (columns: ListColumns) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Default sidebar open on desktop (>= 1024px), closed on mobile
      sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 1024,
      sidebarCollapsed: false,
      viewMode: 'grid',
      selectedGameId: null,
      cardSize: 'medium',
      listColumns: 1,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedGame: (id) => set({ selectedGameId: id }),
      setCardSize: (size) => set({ cardSize: size }),
      setListColumns: (columns) => set({ listColumns: columns })
    }),
    {
      name: 'flashpoint-ui-settings',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen, // Persist sidebar state
        sidebarCollapsed: state.sidebarCollapsed,
        cardSize: state.cardSize,
        viewMode: state.viewMode,
        listColumns: state.listColumns
      })
    }
  )
);
