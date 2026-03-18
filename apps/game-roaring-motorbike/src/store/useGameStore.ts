import { create } from 'zustand';

export type GameState = 'idle' | 'countdown' | 'playing' | 'result';

interface GameStore {
  state: GameState;
  distance: number;
  coins: number;
  topSpeed: number;
  timeLeft: number;
  setState: (s: GameState) => void;
  addDistance: (d: number) => void;
  addCoin: () => void;
  updateTopSpeed: (speed: number) => void;
  setTimeLeft: (t: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: 'idle',
  distance: 0,
  coins: 0,
  topSpeed: 0,
  timeLeft: 0,
  setState: (s) => set({ state: s }),
  addDistance: (d) => set((prev) => ({ distance: prev.distance + d })),
  addCoin: () => set((prev) => ({ coins: prev.coins + 1 })),
  updateTopSpeed: (speed) =>
    set((prev) => ({ topSpeed: Math.max(prev.topSpeed, speed) })),
  setTimeLeft: (t) => set({ timeLeft: t }),
  resetGame: () =>
    set({
      state: 'idle',
      distance: 0,
      coins: 0,
      topSpeed: 0,
      timeLeft: 0,
    }),
}));
