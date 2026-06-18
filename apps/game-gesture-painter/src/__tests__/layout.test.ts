import { describe, expect, it } from 'vitest';
import { getPaletteLayout, hitTestPalette, isInsideDrawingArea, videoToScreen } from '../paint/layout';

describe('videoToScreen', () => {
  it('maps video coordinates through cover scaling', () => {
    const point = videoToScreen({ x: 320, y: 240 }, 640, 480, 1280, 720);

    expect(point.x).toBeCloseTo(640);
    expect(point.y).toBeCloseTo(360);
  });

  it('maps top-left video coordinates to vertically cropped screen space', () => {
    const point = videoToScreen({ x: 0, y: 0 }, 640, 480, 1280, 720);

    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(-120);
  });
});

describe('palette layout', () => {
  it('places six swatches near the bottom center', () => {
    const layout = getPaletteLayout(1280, 720);

    expect(layout.swatches).toHaveLength(6);
    expect(layout.swatches[0].y).toBe(664);
    expect(layout.swatches[0].x).toBeLessThan(layout.swatches[5].x);
  });

  it('detects the nearest swatch hit', () => {
    const layout = getPaletteLayout(1280, 720);
    const second = layout.swatches[1];

    expect(hitTestPalette({ x: second.x + 4, y: second.y - 3 }, layout)?.index).toBe(1);
  });

  it('allows relaxed hits for two-finger color selection', () => {
    const layout = getPaletteLayout(1280, 720);
    const second = layout.swatches[1];

    expect(hitTestPalette({ x: second.x + 32, y: second.y }, layout)?.index).toBe(1);
  });

  it('ignores points outside swatch radius', () => {
    const layout = getPaletteLayout(1280, 720);

    expect(hitTestPalette({ x: 40, y: 40 }, layout)).toBeNull();
  });

  it('keeps drawing out of the palette band', () => {
    expect(isInsideDrawingArea({ x: 400, y: 560 }, 720)).toBe(true);
    expect(isInsideDrawingArea({ x: 400, y: 600 }, 720)).toBe(false);
  });
});
