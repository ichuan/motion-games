import { create } from 'zustand';

export type GameState = 'idle' | 'countdown' | 'playing' | 'result';

interface GameStore {
  state: GameState;
  score: number;
  combo: number;
  bestCombo: number;
  timeLeft: number;
  popped: number;
  missed: number;
  setState: (s: GameState) => void;
  addScore: (n: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  addMiss: () => void;
  setTimeLeft: (t: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: 'idle',
  score: 0,
  combo: 0,
  bestCombo: 0,
  timeLeft: 0,
  popped: 0,
  missed: 0,
  setState: (s) => set({ state: s }),
  addScore: (n) => set((prev) => ({ score: Math.max(0, prev.score + n) })),
  incrementCombo: () =>
    set((prev) => ({
      combo: prev.combo + 1,
      bestCombo: Math.max(prev.bestCombo, prev.combo + 1),
      popped: prev.popped + 1,
    })),
  resetCombo: () => set({ combo: 0 }),
  addMiss: () => set((prev) => ({ missed: prev.missed + 1 })),
  setTimeLeft: (t) => set({ timeLeft: t }),
  resetGame: () =>
    set({
      state: 'idle',
      score: 0,
      combo: 0,
      bestCombo: 0,
      timeLeft: 0,
      popped: 0,
      missed: 0,
    }),
}));
