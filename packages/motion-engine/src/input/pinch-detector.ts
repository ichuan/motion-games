import type { Point2D } from '../tracking/types';
import type { PinchEvent, PinchState } from './types';

const DEFAULT_GRAB_THRESHOLD = 0.04;
const DEFAULT_RELEASE_THRESHOLD = 0.07;

export class PinchDetector {
  private _isPinching = false;
  private _pinchPoint: Point2D | null = null;
  private pendingEvents: PinchEvent[] = [];

  constructor(
    private grabThreshold = DEFAULT_GRAB_THRESHOLD,
    private releaseThreshold = DEFAULT_RELEASE_THRESHOLD,
  ) {}

  update(thumbTip: Point2D, indexTip: Point2D, normalizeWidth: number): PinchState {
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy) / normalizeWidth;

    const midpoint: Point2D = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
    };

    if (!this._isPinching && dist < this.grabThreshold) {
      this._isPinching = true;
      this._pinchPoint = midpoint;
      this.pendingEvents.push({ type: 'pinchstart', point: midpoint });
    } else if (this._isPinching && dist > this.releaseThreshold) {
      this.pendingEvents.push({ type: 'pinchend', point: this._pinchPoint! });
      this._isPinching = false;
      this._pinchPoint = null;
    } else if (this._isPinching) {
      this._pinchPoint = midpoint;
    }

    return { isPinching: this._isPinching, pinchPoint: this._pinchPoint };
  }

  drainEvents(): PinchEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  reset() {
    this._isPinching = false;
    this._pinchPoint = null;
    this.pendingEvents = [];
  }
}
