import type { Point2D } from '@motion-games/engine';

import {
  WRIST,
  THUMB_CMC,
  THUMB_TIP,
  INDEX_MCP,
  INDEX_TIP,
  MIDDLE_MCP,
  MIDDLE_TIP,
  RING_MCP,
  RING_TIP,
  PINKY_MCP,
  PINKY_TIP,
} from '../constants';

export type Gesture = 'open' | 'fist' | 'point';

/** Threshold: fingertip must be this much farther from wrist than its MCP joint */
const EXTEND_RATIO = 1.2;

/** Number of consecutive frames before switching gesture */
const HYSTERESIS_FRAMES = 5;

/** Finger definitions: [tipIndex, mcpIndex] — thumb uses CMC instead of MCP */
const FINGERS: [number, number][] = [
  [THUMB_TIP, THUMB_CMC],
  [INDEX_TIP, INDEX_MCP],
  [MIDDLE_TIP, MIDDLE_MCP],
  [RING_TIP, RING_MCP],
  [PINKY_TIP, PINKY_MCP],
];

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class GestureDetector {
  private current: Gesture = 'open';
  private candidate: Gesture = 'open';
  private candidateFrames = 0;

  /** Analyze landmarks and return detected gesture with hysteresis. */
  detect(landmarks: Point2D[]): Gesture {
    const raw = this.classify(landmarks);

    if (raw === this.current) {
      // Stable — reset candidate
      this.candidate = raw;
      this.candidateFrames = 0;
      return this.current;
    }

    if (raw === this.candidate) {
      this.candidateFrames++;
      if (this.candidateFrames >= HYSTERESIS_FRAMES) {
        this.current = raw;
        this.candidateFrames = 0;
      }
    } else {
      this.candidate = raw;
      this.candidateFrames = 1;
    }

    return this.current;
  }

  /** Raw classification without hysteresis. */
  private classify(landmarks: Point2D[]): Gesture {
    const wrist = landmarks[WRIST];
    const extended: boolean[] = FINGERS.map(([tip, mcp]) => {
      const tipDist = dist(landmarks[tip], wrist);
      const mcpDist = dist(landmarks[mcp], wrist);
      return tipDist > mcpDist * EXTEND_RATIO;
    });

    const count = extended.filter(Boolean).length;

    if (count >= 4) return 'open';
    // Point: index extended, middle/ring/pinky curled (thumb ignored — often ambiguous)
    if (extended[1] && !extended[2] && !extended[3] && !extended[4]) return 'point';
    if (count <= 1) return 'fist';
    return 'open'; // fallback
  }
}
