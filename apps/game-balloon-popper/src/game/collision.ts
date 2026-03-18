import type { BalloonState } from './Balloon';

export function findHitBalloon(
  px: number,
  py: number,
  balloons: BalloonState[],
): BalloonState | null {
  // Check from front (latest) to back for natural z-order
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (!b.alive) continue;
    const dx = px - b.x;
    const dy = py - b.y;
    if (dx * dx + dy * dy <= b.radius * b.radius) {
      return b;
    }
  }
  return null;
}
