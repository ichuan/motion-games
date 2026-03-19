import type { Graphics } from 'pixi.js';
import type { Point2D } from '@motion-games/engine';
import { FINGERTIPS, FINGER_COLORS } from '../constants';

const TRAIL_LEN = 20;
const MAX_WIDTH = 4;
const MIN_WIDTH = 1;

export class FingertipTrails {
  /** ring buffers: one per fingertip, each holding up to TRAIL_LEN positions */
  private trails: (Point2D | null)[][] = FINGERTIPS.map(() => []);

  /** Call every frame with mapped stage-coordinate landmarks */
  update(landmarks: Point2D[] | null): void {
    for (let i = 0; i < FINGERTIPS.length; i++) {
      const buf = this.trails[i];
      if (!landmarks) {
        // no hand detected — age out by pushing null
        buf.push(null);
      } else {
        const lm = landmarks[FINGERTIPS[i]];
        if (lm && Number.isFinite(lm.x)) {
          buf.push({ x: lm.x, y: lm.y });
        } else {
          buf.push(null);
        }
      }
      // keep ring buffer capped
      if (buf.length > TRAIL_LEN) buf.shift();
    }
  }

  /** Draw trails onto the Graphics object (caller does g.clear() beforehand) */
  draw(g: Graphics): void {
    for (let i = 0; i < FINGERTIPS.length; i++) {
      const buf = this.trails[i];
      const color = FINGER_COLORS[i];

      // collect contiguous non-null segments and draw each
      let segStart = -1;
      for (let j = 0; j <= buf.length; j++) {
        const pt = j < buf.length ? buf[j] : null;
        if (pt === null) {
          if (segStart >= 0) {
            this.drawSegment(g, buf as Point2D[], segStart, j, color, buf.length);
            segStart = -1;
          }
        } else if (segStart < 0) {
          segStart = j;
        }
      }
    }
  }

  /** Clear all trail history */
  clear(): void {
    for (const buf of this.trails) buf.length = 0;
  }

  /* ── internal ── */

  private drawSegment(
    g: Graphics,
    buf: Point2D[],
    from: number,
    to: number,
    color: number,
    totalLen: number,
  ): void {
    const count = to - from;
    if (count < 2) return;

    // Draw line segments with per-segment alpha/width
    for (let j = from; j < to - 1; j++) {
      const a = buf[j];
      const b = buf[j + 1];
      // t=0 at oldest, t=1 at newest
      const t = (j - from) / (count - 1);
      // Also factor in where this segment sits in the whole buffer:
      // older buffer positions are more faded
      const bufferT = j / (totalLen - 1);
      const alpha = bufferT * (0.2 + 0.8 * t); // fade from ~0 to 1
      const width = MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * t;

      if (j < to - 2) {
        // use quadratic curve: control = current endpoint, end = midpoint to next
        const c = buf[j + 2];
        const mx = (b.x + c.x) / 2;
        const my = (b.y + c.y) / 2;
        g.setStrokeStyle({ width, color, alpha, cap: 'round' });
        g.moveTo(a.x, a.y);
        g.quadraticCurveTo(b.x, b.y, mx, my);
        g.stroke();
      } else {
        // last segment: simple line
        g.setStrokeStyle({ width, color, alpha, cap: 'round' });
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    }
  }
}
