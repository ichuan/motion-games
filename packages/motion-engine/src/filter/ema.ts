import type { Point2D } from '../tracking/types';

export class EMAFilter {
  private sx = 0;
  private sy = 0;
  private initialized = false;

  constructor(private alpha = 0.4) {}

  update(x: number, y: number): Point2D {
    if (!this.initialized) {
      this.sx = x;
      this.sy = y;
      this.initialized = true;
      return { x, y };
    }
    this.sx = this.alpha * x + (1 - this.alpha) * this.sx;
    this.sy = this.alpha * y + (1 - this.alpha) * this.sy;
    return { x: this.sx, y: this.sy };
  }

  reset() {
    this.initialized = false;
  }
}
