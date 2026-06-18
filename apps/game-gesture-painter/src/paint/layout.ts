import type { Point2D } from '@motion-games/engine';

export interface PaletteSwatch {
  index: number;
  color: string;
  x: number;
  y: number;
  radius: number;
}

export interface PaletteLayout {
  bandHeight: number;
  swatches: PaletteSwatch[];
}

export const PALETTE_COLORS = ['#ff2d55', '#ffd60a', '#0a84ff', '#30d158', '#bf5af2', '#ffffff'] as const;
export const PALETTE_BAND_HEIGHT = 128;
const SWATCH_RADIUS = 14;
const SWATCH_GAP = 30;
const HIT_PADDING = 20;

export function videoToScreen(
  point: Point2D,
  videoWidth: number,
  videoHeight: number,
  screenWidth: number,
  screenHeight: number,
): Point2D {
  const scale = Math.max(screenWidth / videoWidth, screenHeight / videoHeight);
  const offsetX = (screenWidth - videoWidth * scale) / 2;
  const offsetY = (screenHeight - videoHeight * scale) / 2;
  return {
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  };
}

export function getPaletteLayout(screenWidth: number, screenHeight: number): PaletteLayout {
  const totalWidth = (PALETTE_COLORS.length - 1) * (SWATCH_RADIUS * 2 + SWATCH_GAP);
  const startX = screenWidth / 2 - totalWidth / 2;
  const y = screenHeight - 56;

  return {
    bandHeight: PALETTE_BAND_HEIGHT,
    swatches: PALETTE_COLORS.map((color, index) => ({
      index,
      color,
      x: startX + index * (SWATCH_RADIUS * 2 + SWATCH_GAP),
      y,
      radius: SWATCH_RADIUS,
    })),
  };
}

export function hitTestPalette(point: Point2D, layout: PaletteLayout): PaletteSwatch | null {
  for (const swatch of layout.swatches) {
    const radius = swatch.radius + HIT_PADDING;
    if (Math.hypot(point.x - swatch.x, point.y - swatch.y) <= radius) {
      return swatch;
    }
  }
  return null;
}

export function isInsideDrawingArea(point: Point2D, screenHeight: number): boolean {
  return point.y < screenHeight - PALETTE_BAND_HEIGHT;
}
