import { describe, expect, it } from 'vitest';
import { GestureClassifier } from '../gesture/GestureClassifier';
import type { PaintGesture } from '../gesture/types';

type Point = { x: number; y: number };

const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

function baseHand(): Point[] {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  points[WRIST] = { x: 100, y: 220 };

  points[THUMB_CMC] = { x: 70, y: 190 };
  points[THUMB_MCP] = { x: 60, y: 170 };
  points[THUMB_IP] = { x: 55, y: 155 };
  points[THUMB_TIP] = { x: 50, y: 140 };

  points[INDEX_MCP] = { x: 85, y: 155 };
  points[INDEX_PIP] = { x: 85, y: 130 };
  points[INDEX_DIP] = { x: 85, y: 105 };
  points[INDEX_TIP] = { x: 85, y: 75 };

  points[MIDDLE_MCP] = { x: 105, y: 150 };
  points[MIDDLE_PIP] = { x: 105, y: 125 };
  points[MIDDLE_DIP] = { x: 105, y: 100 };
  points[MIDDLE_TIP] = { x: 105, y: 70 };

  points[RING_MCP] = { x: 125, y: 155 };
  points[RING_PIP] = { x: 125, y: 130 };
  points[RING_DIP] = { x: 125, y: 105 };
  points[RING_TIP] = { x: 125, y: 80 };

  points[PINKY_MCP] = { x: 145, y: 165 };
  points[PINKY_PIP] = { x: 145, y: 145 };
  points[PINKY_DIP] = { x: 145, y: 125 };
  points[PINKY_TIP] = { x: 145, y: 100 };

  return points;
}

function curled(points: Point[], tip: number, pip: number, dip: number, mcp: number) {
  points[pip] = { ...points[mcp], y: points[mcp].y + 18 };
  points[dip] = { ...points[mcp], y: points[mcp].y + 28 };
  points[tip] = { ...points[mcp], y: points[mcp].y + 36 };
}

function makePointHand() {
  const points = baseHand();
  curled(points, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_MCP);
  curled(points, RING_TIP, RING_PIP, RING_DIP, RING_MCP);
  curled(points, PINKY_TIP, PINKY_PIP, PINKY_DIP, PINKY_MCP);
  points[THUMB_TIP] = { x: 70, y: 180 };
  return points;
}

function makeTwoFingerHand() {
  const points = makePointHand();
  points[MIDDLE_PIP] = { x: 105, y: 125 };
  points[MIDDLE_DIP] = { x: 105, y: 100 };
  points[MIDDLE_TIP] = { x: 105, y: 70 };
  return points;
}

function makeFistHand() {
  const points = baseHand();
  curled(points, INDEX_TIP, INDEX_PIP, INDEX_DIP, INDEX_MCP);
  curled(points, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_MCP);
  curled(points, RING_TIP, RING_PIP, RING_DIP, RING_MCP);
  curled(points, PINKY_TIP, PINKY_PIP, PINKY_DIP, PINKY_MCP);
  points[THUMB_TIP] = { x: 92, y: 176 };
  return points;
}

function makeThumbDownHand() {
  const points = makeFistHand();
  points[THUMB_TIP] = { x: 55, y: 280 };
  points[THUMB_IP] = { x: 62, y: 255 };
  points[THUMB_MCP] = { x: 72, y: 230 };
  return points;
}

function makePinchHand() {
  const points = makePointHand();
  points[THUMB_TIP] = { x: points[INDEX_TIP].x + 4, y: points[INDEX_TIP].y + 4 };
  return points;
}

function makeAmbiguousVisibleHand() {
  const points = makePointHand();
  points[RING_PIP] = { x: 125, y: 130 };
  points[RING_DIP] = { x: 125, y: 105 };
  points[RING_TIP] = { x: 125, y: 80 };
  return points;
}

function settle(classifier: GestureClassifier, points: Point[], frames = 4): PaintGesture {
  let gesture: PaintGesture = 'none';
  for (let i = 0; i < frames; i++) {
    gesture = classifier.detect(points);
  }
  return gesture;
}

describe('GestureClassifier', () => {
  it('classifies an extended index finger as point', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makePointHand())).toBe('point');
  });

  it('classifies index and middle fingers as twoFingers', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makeTwoFingerHand())).toBe('twoFingers');
  });

  it('classifies an open palm as openPalm', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, baseHand())).toBe('openPalm');
  });

  it('classifies a closed fist as fist', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makeFistHand())).toBe('fist');
  });

  it('classifies thumb and index contact as pinch', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makePinchHand())).toBe('pinch');
  });

  it('classifies a downward thumb as thumbDown', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makeThumbDownHand())).toBe('thumbDown');
  });

  it('returns none when landmarks are missing', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(classifier.detect(null)).toBe('none');
  });

  it('keeps the current gesture through brief missing landmark frames', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makePointHand())).toBe('point');
    expect(classifier.detect(null)).toBe('point');
    expect(classifier.detect(null)).toBe('point');
    expect(classifier.detect(null)).toBe('none');
  });

  it('stops drawing immediately when a visible hand leaves point', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makePointHand())).toBe('point');
    expect(classifier.detect(makeFistHand())).toBe('fist');
  });

  it('stops drawing immediately when the visible hand becomes ambiguous', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makePointHand())).toBe('point');
    expect(classifier.detect(makeAmbiguousVisibleHand())).toBe('none');
  });

  it('requires a new point gesture to be stable before drawing again', () => {
    const classifier = new GestureClassifier({ hysteresisFrames: 3 });

    expect(settle(classifier, makeFistHand())).toBe('fist');
    expect(classifier.detect(makePointHand())).toBe('fist');
    expect(classifier.detect(makePointHand())).toBe('fist');
    expect(classifier.detect(makePointHand())).toBe('point');
  });
});
