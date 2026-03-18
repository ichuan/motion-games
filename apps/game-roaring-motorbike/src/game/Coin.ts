import { COIN_RADIUS } from './constants';

export interface CoinState {
  laneX: number;
  depth: number;
  alive: boolean;
}

export function spawnCoin(): CoinState {
  const lanePositions = [-0.5, 0, 0.5];
  return {
    laneX: lanePositions[Math.floor(Math.random() * lanePositions.length)],
    depth: 0,
    alive: true,
  };
}

export function updateCoin(coin: CoinState, speed: number, dt: number): void {
  coin.depth += (speed / 300) * dt;
}

export function isCoinOffScreen(coin: CoinState): boolean {
  return coin.depth > 1.1;
}

export function drawCoin(g: any, x: number, y: number, scale: number, time: number) {
  const r = COIN_RADIUS * scale;
  const pulse = 1 + Math.sin(time * 4) * 0.1;
  const pr = r * pulse;

  // Golden circle
  g.circle(x, y, pr).fill({ color: 0xFFD54F });
  // Inner ring
  g.circle(x, y, pr * 0.7).stroke({ color: 0xFFA000, width: 1.5 * scale });
  // Shine
  g.circle(x - pr * 0.2, y - pr * 0.2, pr * 0.2).fill({ color: 0xFFFFFF, alpha: 0.6 });
}
