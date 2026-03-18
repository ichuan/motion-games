import { BIKE_STEER_SPEED, CRASH_DURATION, CRASH_SLOWDOWN } from './constants';

export interface BikeState {
  laneX: number;     // -1 to 1
  targetLaneX: number;
  stunTimer: number;
  blinkTimer: number;
}

export function createBike(): BikeState {
  return { laneX: 0, targetLaneX: 0, stunTimer: 0, blinkTimer: 0 };
}

export function updateBike(bike: BikeState, steering: number, dt: number) {
  bike.targetLaneX = Math.max(-1, Math.min(1, steering));

  // Lerp toward target
  const diff = bike.targetLaneX - bike.laneX;
  bike.laneX += diff * BIKE_STEER_SPEED * dt;
  bike.laneX = Math.max(-1, Math.min(1, bike.laneX));

  // Stun countdown
  if (bike.stunTimer > 0) {
    bike.stunTimer = Math.max(0, bike.stunTimer - dt);
    bike.blinkTimer += dt;
  } else {
    bike.blinkTimer = 0;
  }
}

export function crashBike(bike: BikeState) {
  bike.stunTimer = CRASH_DURATION;
  bike.blinkTimer = 0;
}

export function getSpeedMultiplier(bike: BikeState): number {
  return bike.stunTimer > 0 ? CRASH_SLOWDOWN : 1;
}

export function isBikeVisible(bike: BikeState): boolean {
  if (bike.stunTimer <= 0) return true;
  return Math.floor(bike.blinkTimer / 0.1) % 2 === 0;
}

export function drawBike(g: any, x: number, y: number, scale: number, visible: boolean) {
  if (!visible) return;

  const w = 26 * scale;
  const h = 46 * scale;

  // ── Shadow ──
  g.ellipse(x, y + 2 * scale, w * 0.8, 4 * scale).fill({ color: 0x000000, alpha: 0.2 });

  // ── Rear wheel ──
  const wheelR = 6 * scale;
  g.circle(x, y - 2 * scale, wheelR).fill({ color: 0x424242 });
  g.circle(x, y - 2 * scale, wheelR * 0.5).fill({ color: 0x757575 });

  // ── Body (rounded, cute red) ──
  g.roundRect(x - w / 2, y - h * 0.85, w, h * 0.75, 6 * scale).fill({ color: 0xEF5350 });

  // Body shine (glossy effect)
  g.roundRect(x - w * 0.35, y - h * 0.82, w * 0.25, h * 0.4, 3 * scale)
    .fill({ color: 0xFFCDD2, alpha: 0.4 });

  // ── Seat ──
  g.roundRect(x - w * 0.3, y - h * 0.45, w * 0.6, h * 0.15, 3 * scale)
    .fill({ color: 0x5D4037 });

  // ── Rider (cute minimal character) ──
  // Body
  g.roundRect(x - w * 0.22, y - h * 0.78, w * 0.44, h * 0.3, 4 * scale)
    .fill({ color: 0x1565C0 });
  // Helmet
  const headR = 7 * scale;
  g.circle(x, y - h * 0.85, headR).fill({ color: 0xFFF176 });
  // Visor
  g.roundRect(x - headR * 0.7, y - h * 0.87, headR * 1.4, headR * 0.5, 2 * scale)
    .fill({ color: 0x42A5F5, alpha: 0.7 });

  // ── Windshield ──
  g.roundRect(x - w * 0.25, y - h * 0.95, w * 0.5, h * 0.1, 3 * scale)
    .fill({ color: 0x90CAF9, alpha: 0.6 });

  // ── Front wheel ──
  g.circle(x, y - h + 4 * scale, wheelR).fill({ color: 0x424242 });
  g.circle(x, y - h + 4 * scale, wheelR * 0.5).fill({ color: 0x757575 });

  // ── Handlebars ──
  g.moveTo(x - w * 0.65, y - h * 0.72)
    .lineTo(x + w * 0.65, y - h * 0.72)
    .stroke({ color: 0x9E9E9E, width: 2.5 * scale });

  // ── Headlight (glowing) ──
  g.circle(x, y - h, 4 * scale).fill({ color: 0xFFEB3B, alpha: 0.5 });
  g.circle(x, y - h, 2.5 * scale).fill({ color: 0xFFF9C4 });

  // ── Tail light ──
  g.roundRect(x - w * 0.2, y - 1 * scale, w * 0.4, 3 * scale, 1 * scale)
    .fill({ color: 0xFF1744, alpha: 0.9 });

  // ── Exhaust pipes ──
  g.roundRect(x + w * 0.35, y - h * 0.25, w * 0.25, 3 * scale, 1 * scale)
    .fill({ color: 0x9E9E9E });
  g.roundRect(x - w * 0.6, y - h * 0.25, w * 0.25, 3 * scale, 1 * scale)
    .fill({ color: 0x9E9E9E });
}
