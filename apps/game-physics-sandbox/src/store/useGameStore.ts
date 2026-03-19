import { create } from 'zustand';

export type GameState = 'idle' | 'countdown' | 'playing' | 'result';

interface GameStore {
  state: GameState;
  score: number;
  blocksToppled: number;
  towersCleared: number;
  towerLevel: number;
  timeLeft: number;
  setState: (s: GameState) => void;
  addScore: (n: number) => void;
  addBlocksToppled: (n: number) => void;
  clearTower: () => void;
  setTimeLeft: (t: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: 'idle',
  score: 0,
  blocksToppled: 0,
  towersCleared: 0,
  towerLevel: 1,
  timeLeft: 0,
  setState: (s) => set({ state: s }),
  addScore: (n) => set((prev) => ({ score: prev.score + n })),
  addBlocksToppled: (n) => set((prev) => ({ blocksToppled: prev.blocksToppled + n })),
  clearTower: () => set((prev) => ({
    towersCleared: prev.towersCleared + 1,
    towerLevel: prev.towerLevel + 1,
  })),
  setTimeLeft: (t) => set({ timeLeft: t }),
  resetGame: () => set({
    state: 'idle',
    score: 0,
    blocksToppled: 0,
    towersCleared: 0,
    towerLevel: 1,
    timeLeft: 0,
  }),
}));
