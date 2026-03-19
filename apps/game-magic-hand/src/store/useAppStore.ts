import { create } from 'zustand';

type AppState = 'idle' | 'active';

interface AppStore {
  state: AppState;
  setState: (s: AppState) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  state: 'idle',
  setState: (s) => set({ state: s }),
}));
