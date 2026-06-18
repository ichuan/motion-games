import type { Point2D } from '@motion-games/engine';

export type PaintGesture = 'none' | 'point' | 'pinch' | 'openPalm' | 'fist' | 'thumbDown' | 'twoFingers';

export interface GestureClassifierOptions {
  hysteresisFrames?: number;
  extendRatio?: number;
  pinchDistanceRatio?: number;
  thumbDownRatio?: number;
}

export type LandmarkList = Point2D[] | null;
