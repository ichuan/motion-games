import type { BalloonState } from './Balloon';

export function findHitBalloon(
  px: number,
  py: number,
  balloons: BalloonState[],
): BalloonState | null {
  // Check from front (latest) to back for natural z-order
  // Use 1.5x radius for more forgiving hit detection
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (!b.alive) continue;
    const dx = px - b.x;
    const dy = py - b.y;
    const hitR = b.radius * 1.5;
    if (dx * dx + dy * dy <= hitR * hitR) {
      return b;
    }
  }
  return null;
}
