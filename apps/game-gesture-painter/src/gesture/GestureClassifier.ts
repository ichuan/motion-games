import type { GestureClassifierOptions, LandmarkList, PaintGesture } from './types';

const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

const DEFAULT_HYSTERESIS_FRAMES = 4;
const DEFAULT_EXTEND_RATIO = 1.18;
const DEFAULT_PINCH_DISTANCE_RATIO = 0.12;
const DEFAULT_THUMB_DOWN_RATIO = 0.35;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function palmSize(landmarks: NonNullable<LandmarkList>): number {
  const wrist = landmarks[WRIST];
  const middle = landmarks[MIDDLE_MCP];
  return Math.max(1, distance(wrist, middle));
}

export class GestureClassifier {
  private current: PaintGesture = 'none';
  private candidate: PaintGesture = 'none';
  private candidateFrames = 0;
  private readonly hysteresisFrames: number;
  private readonly extendRatio: number;
  private readonly pinchDistanceRatio: number;
  private readonly thumbDownRatio: number;

  constructor(options: GestureClassifierOptions = {}) {
    this.hysteresisFrames = options.hysteresisFrames ?? DEFAULT_HYSTERESIS_FRAMES;
    this.extendRatio = options.extendRatio ?? DEFAULT_EXTEND_RATIO;
    this.pinchDistanceRatio = options.pinchDistanceRatio ?? DEFAULT_PINCH_DISTANCE_RATIO;
    this.thumbDownRatio = options.thumbDownRatio ?? DEFAULT_THUMB_DOWN_RATIO;
  }

  detect(landmarks: LandmarkList): PaintGesture {
    const hasVisibleHand = Boolean(landmarks && landmarks.length >= 21);
    const raw = this.classify(landmarks);

    if (this.current === 'point' && hasVisibleHand && raw !== 'point') {
      this.current = raw;
      this.candidate = raw;
      this.candidateFrames = 0;
      return this.current;
    }

    if (raw === this.current) {
      this.candidate = raw;
      this.candidateFrames = 0;
      return this.current;
    }

    if (raw === this.candidate) {
      this.candidateFrames++;
      if (this.candidateFrames >= this.hysteresisFrames) {
        this.current = raw;
        this.candidateFrames = 0;
      }
    } else {
      this.candidate = raw;
      this.candidateFrames = 1;
    }

    return this.current;
  }

  private classify(landmarks: LandmarkList): PaintGesture {
    if (!landmarks || landmarks.length < 21) return 'none';

    const wrist = landmarks[WRIST];
    const size = palmSize(landmarks);
    const extended = {
      thumb: distance(landmarks[THUMB_TIP], wrist) > distance(landmarks[THUMB_CMC], wrist) * this.extendRatio,
      index: distance(landmarks[INDEX_TIP], wrist) > distance(landmarks[INDEX_MCP], wrist) * this.extendRatio,
      middle: distance(landmarks[MIDDLE_TIP], wrist) > distance(landmarks[MIDDLE_MCP], wrist) * this.extendRatio,
      ring: distance(landmarks[RING_TIP], wrist) > distance(landmarks[RING_MCP], wrist) * this.extendRatio,
      pinky: distance(landmarks[PINKY_TIP], wrist) > distance(landmarks[PINKY_MCP], wrist) * this.extendRatio,
    };

    const pinchDistance = distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / size;
    if (pinchDistance <= this.pinchDistanceRatio) return 'pinch';

    const thumbBelowWrist = landmarks[THUMB_TIP].y > wrist.y + size * this.thumbDownRatio;
    if (thumbBelowWrist && !extended.index && !extended.middle && !extended.ring && !extended.pinky) {
      return 'thumbDown';
    }

    if (extended.index && extended.middle && !extended.ring && !extended.pinky) return 'twoFingers';
    if (extended.index && !extended.middle && !extended.ring && !extended.pinky) return 'point';

    const count = Object.values(extended).filter(Boolean).length;
    if (count >= 4) return 'openPalm';
    if (count <= 1) return 'fist';
    return 'none';
  }
}
