import { OBSTACLE_WIDTH, OBSTACLE_HEIGHT } from './constants';

export interface ObstacleState {
  laneX: number;     // -1 to 1
  depth: number;     // 0 = vanishing point, 1 = screen bottom
  type: 'car' | 'barrier';
  color: number;
  alive: boolean;
}

// Cute candy-like car colors
const CAR_COLORS = [0x42A5F5, 0xAB47BC, 0x26A69A, 0xFF7043, 0xFFCA28, 0xEC407A];

export function spawnObstacle(): ObstacleState {
  const lanePositions = [-0.6, 0, 0.6]; // left, center, right
  const laneX = lanePositions[Math.floor(Math.random() * lanePositions.length)];
  const isCar = Math.random() > 0.3;

  return {
    laneX: laneX + (Math.random() - 0.5) * 0.15,
    depth: 0,
    type: isCar ? 'car' : 'barrier',
    color: isCar
      ? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
      : 0xFF8F00,
    alive: true,
  };
}

export function updateObstacle(obs: ObstacleState, speed: number, dt: number): void {
  obs.depth += (speed / 150) * dt;
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
    // ── Shadow ──
    g.ellipse(x, y + 2 * scale, w * 0.7, 3 * scale).fill({ color: 0x000000, alpha: 0.15 });

    // ── Car body (rounded, bubbly) ──
    g.roundRect(x - w / 2, y - h, w, h, 5 * scale).fill({ color: obs.color });

    // Body shine
    g.roundRect(x - w * 0.35, y - h * 0.92, w * 0.2, h * 0.35, 3 * scale)
      .fill({ color: 0xFFFFFF, alpha: 0.25 });

    // ── Roof / cabin ──
    g.roundRect(x - w * 0.35, y - h * 0.9, w * 0.7, h * 0.35, 4 * scale)
      .fill({ color: darken(obs.color, 0.15) });

    // ── Windshield (cute big window) ──
    g.roundRect(x - w * 0.28, y - h * 0.85, w * 0.56, h * 0.2, 3 * scale)
      .fill({ color: 0xBBDEFB, alpha: 0.8 });

    // ── Eyes (cute headlights that look like eyes) ──
    const eyeY = y - h + 5 * scale;
    // Left eye
    g.circle(x - w * 0.25, eyeY, 3.5 * scale).fill({ color: 0xFFFFFF });
    g.circle(x - w * 0.25, eyeY, 2 * scale).fill({ color: 0x263238 });
    g.circle(x - w * 0.28, eyeY - 0.8 * scale, 1 * scale).fill({ color: 0xFFFFFF, alpha: 0.8 });
    // Right eye
    g.circle(x + w * 0.25, eyeY, 3.5 * scale).fill({ color: 0xFFFFFF });
    g.circle(x + w * 0.25, eyeY, 2 * scale).fill({ color: 0x263238 });
    g.circle(x + w * 0.22, eyeY - 0.8 * scale, 1 * scale).fill({ color: 0xFFFFFF, alpha: 0.8 });

    // ── Tail lights ──
    g.roundRect(x - w * 0.4, y - 4 * scale, 4 * scale, 3 * scale, 1 * scale)
      .fill({ color: 0xFF1744 });
    g.roundRect(x + w * 0.4 - 4 * scale, y - 4 * scale, 4 * scale, 3 * scale, 1 * scale)
      .fill({ color: 0xFF1744 });

    // ── Wheels ──
    g.circle(x - w * 0.35, y - 2 * scale, 3 * scale).fill({ color: 0x424242 });
    g.circle(x + w * 0.35, y - 2 * scale, 3 * scale).fill({ color: 0x424242 });

  } else {
    // ── Barrier — orange/white striped with warning signs ──

    // Shadow
    g.ellipse(x, y + 1 * scale, w * 0.9, 2 * scale).fill({ color: 0x000000, alpha: 0.12 });

    // Main barrier body
    g.roundRect(x - w * 0.8, y - h * 0.4, w * 1.6, h * 0.4, 3 * scale)
      .fill({ color: obs.color });

    // White stripes
    for (let i = 0; i < 4; i++) {
      const sx = x - w * 0.7 + i * w * 0.4;
      g.roundRect(sx, y - h * 0.35, w * 0.15, h * 0.3, 1 * scale)
        .fill({ color: 0xFFFFFF, alpha: 0.85 });
    }

    // Warning triangle on center
    const triY = y - h * 0.35;
    const triSize = 4 * scale;
    g.moveTo(x, triY)
      .lineTo(x - triSize, triY + triSize * 1.5)
      .lineTo(x + triSize, triY + triSize * 1.5)
      .closePath()
      .fill({ color: 0xFFEB3B });
    // Exclamation mark
    g.rect(x - 0.5 * scale, triY + 2 * scale, 1 * scale, 3 * scale)
      .fill({ color: 0x000000 });
    g.circle(x, triY + triSize * 1.2, 0.7 * scale).fill({ color: 0x000000 });

    // Support posts
    g.rect(x - w * 0.6, y - h * 0.4, 2 * scale, h * 0.4).fill({ color: 0x757575 });
    g.rect(x + w * 0.6 - 2 * scale, y - h * 0.4, 2 * scale, h * 0.4).fill({ color: 0x757575 });
  }
}

/** Darken a hex color by factor (0-1) */
function darken(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xFF) * (1 - factor));
  const g = Math.round(((color >> 8) & 0xFF) * (1 - factor));
  const b = Math.round((color & 0xFF) * (1 - factor));
  return (r << 16) | (g << 8) | b;
}
