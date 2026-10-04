import { create } from 'zustand';
import { churchesService } from '@/services';
import type { Church } from '@/types';

interface ChurchState {
  churches: Church[];
  currentChurch: Church | null;
  isLoading: boolean;
  loadChurches: () => Promise<void>;
  selectChurch: (church: Church) => void;
  /** Keeps every screen holding a copy of this church in sync after an edit. */
  replaceChurch: (church: Church) => void;
}

export const useChurchStore = create<ChurchState>((set, get) => ({
  churches: [],
  currentChurch: null,
  isLoading: false,

  loadChurches: async () => {
    set({ isLoading: true });
    try {
      const churches = await churchesService.listMine();
      const { currentChurch } = get();
      set({
        churches,
        currentChurch: currentChurch ?? churches[0] ?? null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  selectChurch: (church) => set({ currentChurch: church }),

  replaceChurch: (church) =>
    set((state) => ({
      churches: state.churches.map((entry) => (entry.id === church.id ? church : entry)),
      currentChurch: state.currentChurch?.id === church.id ? church : state.currentChurch,
    })),
}));
