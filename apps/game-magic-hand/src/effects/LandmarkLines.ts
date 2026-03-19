import type { Graphics } from 'pixi.js';
import type { Point2D } from '@motion-games/engine';
import { CONNECTIONS, getConnectionColor } from '../constants';

export function drawLandmarkLines(g: Graphics, landmarks: Point2D[]) {
  for (const [a, b] of CONNECTIONS) {
    const pa = landmarks[a], pb = landmarks[b];
    if (!Number.isFinite(pa.x) || !Number.isFinite(pb.x)) continue;
    const color = getConnectionColor(a, b);
    g.moveTo(pa.x, pa.y).lineTo(pb.x, pb.y).stroke({ color, width: 2.5, alpha: 0.7 });
  }
  // Joint dots
  for (const p of landmarks) {
    if (!Number.isFinite(p.x)) continue;
    g.circle(p.x, p.y, 3).fill({ color: 0xFFFFFF, alpha: 0.6 });
  }
}
