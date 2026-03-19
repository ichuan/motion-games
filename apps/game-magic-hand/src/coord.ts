import type { Point2D } from '@motion-games/engine';

/**
 * Map hand landmark coordinates from video space to PixiJS stage space.
 * Accounts for cover-mode scaling (video fills screen, may crop edges).
 */
export function videoToStage(
  lx: number, ly: number,
  vw: number, vh: number,
  sw: number, sh: number,
): Point2D {
  const scale = Math.max(sw / vw, sh / vh);
  const offsetX = (sw - vw * scale) / 2;
  const offsetY = (sh - vh * scale) / 2;
  return {
    x: lx * scale + offsetX,
    y: ly * scale + offsetY,
  };
}

/**
 * Map all 21 landmarks from video space to stage space.
 */
export function mapAllLandmarks(
  landmarks: Point2D[],
  vw: number, vh: number,
  sw: number, sh: number,
): Point2D[] {
  return landmarks.map(p => videoToStage(p.x, p.y, vw, vh, sw, sh));
}
