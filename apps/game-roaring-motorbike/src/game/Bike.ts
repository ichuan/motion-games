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
  // Blink during stun: visible every 0.1s
  return Math.floor(bike.blinkTimer / 0.1) % 2 === 0;
}

export function drawBike(g: any, x: number, y: number, scale: number, visible: boolean) {
  if (!visible) return;

  const w = 24 * scale;
  const h = 44 * scale;

  // Body
  g.roundRect(x - w / 2, y - h, w, h, 4 * scale).fill({ color: 0xE53935 });

  // Windshield
  g.roundRect(x - w * 0.3, y - h * 0.95, w * 0.6, h * 0.2, 2 * scale)
    .fill({ color: 0x42A5F5, alpha: 0.8 });

  // Wheels
  const wheelR = 5 * scale;
  g.circle(x, y - 4 * scale, wheelR).fill({ color: 0x333333 });
  g.circle(x, y - h + 2 * scale, wheelR).fill({ color: 0x333333 });

  // Handlebars
  g.moveTo(x - w * 0.7, y - h * 0.7)
    .lineTo(x + w * 0.7, y - h * 0.7)
    .stroke({ color: 0x888888, width: 2.5 * scale });

  // Headlight
  g.circle(x, y - h - 2 * scale, 3 * scale).fill({ color: 0xFFEB3B, alpha: 0.9 });
}
