// HandToFluid: reads hand tracking landmarks each frame and injects velocity/dye splats
// into the FluidSim, translating physical hand motion into water-jutsu effects.
//
// Gesture mapping:
//   open palm  → wide spread (multi-point splat)
//   pinch      → concentrated high-pressure water jet
//   static/no hand → no splat

import type { Point2D } from '@motion-games/engine';
import {
  FLUID_VELOCITY_SCALE, FLUID_RADIUS_OPEN, FLUID_RADIUS_PINCH,
  WATER_COLOR_PRIMARY, WATER_COLOR_SECONDARY,
} from './constants';

type SplatFn = (
  x: number, y: number,
  dx: number, dy: number,
  color: [number, number, number],
  radius?: number
) => void;

/** Indices of fingertip landmarks in the TF.js hand pose model. */
const FINGERTIPS = [4, 8, 12, 16, 20];

/** Palm center: average of wrist (0) and middle-finger MCP (9). */
function palmCenter(lm: Point2D[]): Point2D {
  return {
    x: (lm[0].x + lm[9].x) / 2,
    y: (lm[0].y + lm[9].y) / 2,
  };
}

export class HandToFluid {
  private prevPositions: Map<number, Point2D> = new Map();
  private frameCount = 0;

  /** Call this every frame with the current hand landmarks (or null) and the splat function. */
  update(
    landmarks: Point2D[] | null,
    isPinch: boolean,
    splat: SplatFn,
    screenWidth: number,
    screenHeight: number,
  ): void {
    this.frameCount++;

    if (!landmarks || landmarks.length < 21) {
      this.prevPositions.clear();
      return;
    }

    const center = palmCenter(landmarks);

    // Compute velocity from frame-to-frame delta of palm center
    const prevCenter = this.prevPositions.get(0) ?? center;
    const dx = (center.x - prevCenter.x) / screenWidth;
    const dy = (center.y - prevCenter.y) / screenHeight;
    const speed = Math.hypot(dx * screenWidth, dy * screenHeight); // px/frame

    // Normalize splat position to [0,1] screen UV.
    // Landmarks are already in visual (mirror) screen-pixel space after mapping via (lm.x/vw)*screenW.
    const nx = center.x / screenWidth;
    const ny = center.y / screenHeight;

    if (isPinch) {
      // Concentrated water jet: single high-pressure splat at index fingertip
      const tip = landmarks[8];
      const tipX = tip.x / screenWidth;
      const tipY = tip.y / screenHeight;
      splat(
        tipX, tipY,
        dx * FLUID_VELOCITY_SCALE * 2,
        dy * FLUID_VELOCITY_SCALE * 2,
        WATER_COLOR_PRIMARY,
        FLUID_RADIUS_PINCH,
      );
    } else if (speed > 2) {
      // Open palm: multi-point splat for a broad water-wave effect.
      // Alternate color between primary and secondary for visual variety.
      const color = this.frameCount % 3 === 0 ? WATER_COLOR_SECONDARY : WATER_COLOR_PRIMARY;

      // Palm center splat
      splat(
        nx, ny,
        dx * FLUID_VELOCITY_SCALE,
        dy * FLUID_VELOCITY_SCALE,
        color,
        FLUID_RADIUS_OPEN,
      );

      // Fingertip splats with reduced force for broader spread
      for (const tipIdx of FINGERTIPS) {
        if (tipIdx >= landmarks.length) continue;
        const tip = landmarks[tipIdx];
        const tx = tip.x / screenWidth;
        const ty = tip.y / screenHeight;
        splat(
          tx, ty,
          dx * FLUID_VELOCITY_SCALE * 0.7,
          dy * FLUID_VELOCITY_SCALE * 0.7,
          color,
          FLUID_RADIUS_OPEN * 0.6,
        );
      }
    }

    // Store current positions for next frame velocity computation
    this.prevPositions.set(0, center);
    for (const i of FINGERTIPS) {
      if (i < landmarks.length) this.prevPositions.set(i, landmarks[i]);
    }
  }

  reset(): void {
    this.prevPositions.clear();
  }
}
