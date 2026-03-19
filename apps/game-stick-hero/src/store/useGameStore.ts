import { create } from 'zustand';

type GameState = 'idle' | 'countdown' | 'playing' | 'result';

interface GameStore {
  state: GameState;
  score: number;
  bestScore: number;
  perfectCount: number;
  setState: (s: GameState) => void;
  addScore: (n: number) => void;
  addPerfect: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: 'idle',
  score: 0,
  bestScore: 0,
  perfectCount: 0,
  setState: (state) => set({ state }),
  addScore: (n) => set((s) => ({ score: s.score + n })),
  addPerfect: () => set((s) => ({ perfectCount: s.perfectCount + 1 })),
  resetGame: () =>
    set((s) => ({
      state: 'idle',
      score: 0,
      bestScore: Math.max(s.bestScore, s.score),
      perfectCount: 0,
    })),
}));
