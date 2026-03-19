import { PhysicsWorld } from './PhysicsWorld';
import { THROWABLE_X_RATIO, PLATFORM_Y_RATIO, BALL_COLOR, BOX_COLOR } from './constants';

export interface Throwable {
  handle: number;
  shape: 'ball' | 'box';
  color: number;
  grabbed: boolean;
  thrown: boolean;
}

/** Spawn a throwable object on the left side */
export function spawnThrowable(
  world: PhysicsWorld,
  screenW: number,
  screenH: number,
  index: number,
): Throwable {
  const baseX = screenW * THROWABLE_X_RATIO;
  const groundY = screenH * PLATFORM_Y_RATIO;
  // Stack them vertically with spacing
  const x = baseX + (index - 1) * 60;
  const y = groundY - 30;

  const isBall = Math.random() > 0.4;
  const shape = isBall ? 'ball' : 'box';
  const color = isBall ? BALL_COLOR : BOX_COLOR;

  let handle: number;
  if (isBall) {
    handle = world.addBall(x, y, 18, color);
  } else {
    handle = world.addBox(x, y, 36, 36, color);
  }

  return { handle, shape, color, grabbed: false, thrown: false };
}

/** Find the nearest throwable to cursor position */
export function findNearestThrowable(
  world: PhysicsWorld,
  throwables: Throwable[],
  cx: number,
  cy: number,
  maxDist: number,
): Throwable | null {
  let best: Throwable | null = null;
  let bestDist = maxDist;

  for (const t of throwables) {
    if (t.grabbed || t.thrown) continue;
    const info = world.getBody(t.handle);
    if (!info) continue;
    const dx = info.x - cx;
    const dy = info.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = t;
    }
  }

  return best;
}
