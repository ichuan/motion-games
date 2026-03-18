import type { Point2D } from '../tracking/types';

export interface PinchState {
  isPinching: boolean;
  pinchPoint: Point2D | null;
}

export type PinchEventType = 'pinchstart' | 'pinchend';

export interface PinchEvent {
  type: PinchEventType;
  point: Point2D;
}
