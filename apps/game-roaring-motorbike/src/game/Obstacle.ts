import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT } from './constants';

export interface ObstacleState {
  laneX: number;     // -1 to 1
  depth: number;     // 0 = vanishing point, 1 = screen bottom
  type: 'car' | 'barrier';
  color: number;
  alive: boolean;
}

const CAR_COLORS = [0x1565C0, 0x6A1B9A, 0x00695C, 0xE65100, 0x37474F];

export function spawnObstacle(): ObstacleState {
  const lanePositions = [-0.6, 0, 0.6]; // left, center, right
  const laneX = lanePositions[Math.floor(Math.random() * lanePositions.length)];
  const isCar = Math.random() > 0.3;

  return {
    laneX: laneX + (Math.random() - 0.5) * 0.15, // slight random offset
    depth: 0,
    type: isCar ? 'car' : 'barrier',
    color: isCar
      ? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
      : 0xFF8F00,
    alive: true,
  };
}

export function updateObstacle(obs: ObstacleState, speed: number, dt: number): void {
  // Depth increases as obstacle "approaches" the player
  // Speed in depth-units per second (normalized so full depth takes ~2s at max speed)
  obs.depth += (speed / 300) * dt;
}

export function isObstacleOffScreen(obs: ObstacleState): boolean {
  return obs.depth > 1.1;
}

export function drawObstacle(
  g: any, obs: ObstacleState,
  x: number, y: number, scale: number,
) {
  if (!obs.alive) return;

  const w = OBSTACLE_WIDTH * scale;
  const h = OBSTACLE_HEIGHT * scale;

  if (obs.type === 'car') {
    // Car body
    g.roundRect(x - w / 2, y - h, w, h, 3 * scale).fill({ color: obs.color });
    // Windshield
    g.roundRect(x - w * 0.35, y - h * 0.85, w * 0.7, h * 0.2, 2 * scale)
      .fill({ color: 0xBBDEFB, alpha: 0.7 });
    // Tail lights
    g.circle(x - w * 0.3, y - 3 * scale, 2 * scale).fill({ color: 0xFF1744 });
    g.circle(x + w * 0.3, y - 3 * scale, 2 * scale).fill({ color: 0xFF1744 });
  } else {
    // Barrier — horizontal striped block
    g.roundRect(x - w * 0.8, y - h * 0.4, w * 1.6, h * 0.4, 2 * scale)
      .fill({ color: obs.color });
    // White stripes
    for (let i = 0; i < 3; i++) {
      const sx = x - w * 0.6 + i * w * 0.5;
      g.rect(sx, y - h * 0.35, w * 0.2, h * 0.3).fill({ color: 0xFFFFFF, alpha: 0.8 });
    }
  }
}
