// Geometric collision detection between hand and fire targets.
// No GPU readback — uses 2D Euclidean distance with a minimum-speed gate.
//
// Hit condition:
//   distance(palm, target_center) < (target.radius + HAND_HIT_RADIUS)
//   AND handSpeed (px/s) > MIN_HIT_SPEED

import type { Point2D } from '@motion-games/engine';
import { HAND_HIT_RADIUS, MIN_HIT_SPEED } from './constants';
import type { FireTarget } from './FireTarget';

/** Returns which targets were newly hit this frame. */
export function checkCollisions(
  landmarks: Point2D[] | null,
  handSpeed: number,           // px/s
  targets: readonly FireTarget[],
): FireTarget[] {
  if (!landmarks || landmarks.length < 21 || handSpeed < MIN_HIT_SPEED) {
    return [];
  }

  // Use palm center (wrist + middle MCP average) as the hit point.
  const palmX = (landmarks[0].x + landmarks[9].x) / 2;
  const palmY = (landmarks[0].y + landmarks[9].y) / 2;

  const hit: FireTarget[] = [];
  for (const t of targets) {
    if (t.state !== 'alive') continue;

    // Camera is mirrored (CSS scaleX(-1)), so target x is already mirrored.
    const dist = Math.hypot(palmX - t.x, palmY - t.y);
    const threshold = t.radius + HAND_HIT_RADIUS;

    if (dist < threshold) {
      hit.push(t);
    }
  }
  return hit;
}
