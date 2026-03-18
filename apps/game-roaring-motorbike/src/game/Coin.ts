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
  coin.depth += (speed / 150) * dt;
}

export function isCoinOffScreen(coin: CoinState): boolean {
  return coin.depth > 1.1;
}

export function drawCoin(g: any, x: number, y: number, scale: number, time: number) {
  const r = COIN_RADIUS * scale;
  const pulse = 1 + Math.sin(time * 5) * 0.12;
  const pr = r * pulse;

  // Glow
  g.circle(x, y, pr * 1.4).fill({ color: 0xFFD54F, alpha: 0.15 });

  // Outer ring (golden)
  g.circle(x, y, pr).fill({ color: 0xFFCA28 });

  // Inner face
  g.circle(x, y, pr * 0.78).fill({ color: 0xFFD54F });

  // Star shape in center
  const starR = pr * 0.35;
  const cx = x;
  const cy = y;
  const points = 5;
  const rot = time * 2; // slow rotation
  // Draw a simple star approximation as overlapping diamonds
  for (let i = 0; i < points; i++) {
    const angle = rot + (i * Math.PI * 2) / points - Math.PI / 2;
    const tipX = cx + Math.cos(angle) * starR;
    const tipY = cy + Math.sin(angle) * starR;
    g.circle(tipX, tipY, starR * 0.35).fill({ color: 0xFFA000, alpha: 0.7 });
  }

  // Center dot
  g.circle(x, y, pr * 0.15).fill({ color: 0xFFA000 });

  // Shine highlight
  g.circle(x - pr * 0.25, y - pr * 0.25, pr * 0.2).fill({ color: 0xFFFFFF, alpha: 0.7 });

  // Edge highlight (3D effect)
  g.circle(x, y, pr).stroke({ color: 0xE6A800, width: 1.5 * scale, alpha: 0.5 });
}
