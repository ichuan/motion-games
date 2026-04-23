// Unit tests for game-water-jutsu core modules.
// Runs in Node (no DOM / WebGL required).

import { describe, it, expect, beforeEach } from 'vitest';
import { checkCollisions } from '../game/collision';
import { HAND_HIT_RADIUS, MIN_HIT_SPEED, FIRE_SEAL_RADIUS } from '../game/constants';
import { HandToFluid } from '../game/HandToFluid';

// ── Minimal FireTarget stub for collision tests ────────────────────────────
function makeTarget(x: number, y: number, overrides = {}) {
  return {
    x,
    y,
    radius: FIRE_SEAL_RADIUS,
    kind: 'seal' as const,
    state: 'alive' as const,
    markHit: () => {},
    ...overrides,
  } as any;
}

// Build a minimal 21-landmark array (all at same position)
function makeLandmarks(px: number, py: number) {
  return Array.from({ length: 21 }, () => ({ x: px, y: py }));
}

// ── Collision tests ────────────────────────────────────────────────────────
describe('collision — checkCollisions', () => {
  it('returns empty array when no landmarks provided', () => {
    const targets = [makeTarget(200, 300)];
    expect(checkCollisions(null, 999, targets)).toHaveLength(0);
  });

  it('returns empty array when hand speed is below threshold', () => {
    const t = makeTarget(100, 100);
    // All landmarks at 100, 100 — exactly overlapping target
    const lm = makeLandmarks(100, 100);
    expect(checkCollisions(lm, MIN_HIT_SPEED - 1, [t])).toHaveLength(0);
  });

  it('detects hit when palm is within threshold and speed is sufficient', () => {
    const t = makeTarget(100, 100);
    // Palm center = avg of lm[0] and lm[9] = 100, 100
    const lm = makeLandmarks(100, 100);
    const hits = checkCollisions(lm, MIN_HIT_SPEED + 10, [t]);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toBe(t);
  });

  it('misses when palm is too far from target', () => {
    const t = makeTarget(500, 500);
    const lm = makeLandmarks(100, 100);
    const hits = checkCollisions(lm, 999, [t]);
    expect(hits).toHaveLength(0);
  });

  it('respects combined radius: (target.radius + HAND_HIT_RADIUS)', () => {
    const threshold = FIRE_SEAL_RADIUS + HAND_HIT_RADIUS;
    // Place palm just inside threshold
    const t = makeTarget(0, 0);
    const lm = makeLandmarks(threshold - 1, 0);
    expect(checkCollisions(lm, 999, [t])).toHaveLength(1);
    // Just outside
    const lm2 = makeLandmarks(threshold + 1, 0);
    expect(checkCollisions(lm2, 999, [t])).toHaveLength(0);
  });

  it('skips non-alive targets', () => {
    const hitTarget  = makeTarget(100, 100, { state: 'hit' });
    const deadTarget = makeTarget(100, 100, { state: 'dead' });
    const lm = makeLandmarks(100, 100);
    expect(checkCollisions(lm, 999, [hitTarget, deadTarget])).toHaveLength(0);
  });

  it('returns multiple hits when two targets overlap the hand', () => {
    const t1 = makeTarget(100, 100);
    const t2 = makeTarget(102, 102); // very close — both hit
    const lm = makeLandmarks(100, 100);
    expect(checkCollisions(lm, 999, [t1, t2])).toHaveLength(2);
  });
});

// ── HandToFluid tests ───────────────────────────────────────────────────────
describe('HandToFluid', () => {
  let hf: HandToFluid;
  const splatCalls: Array<Parameters<typeof hf.update>[2]> = [];
  let capturedSplats: Array<{ x: number; y: number }> = [];

  beforeEach(() => {
    hf = new HandToFluid();
    capturedSplats = [];
  });

  it('emits no splats when landmarks are null', () => {
    const splat = (x: number, y: number) => { capturedSplats.push({ x, y }); };
    hf.update(null, false, splat, 800, 600);
    expect(capturedSplats).toHaveLength(0);
  });

  it('emits no splats when hand is stationary (speed ≈ 0)', () => {
    const lm = makeLandmarks(400, 300);
    const splat = (x: number, y: number) => { capturedSplats.push({ x, y }); };
    // First call: sets prevPosition
    hf.update(lm, false, splat, 800, 600);
    capturedSplats = [];
    // Second call: same position → speed = 0, no splat
    hf.update(lm, false, splat, 800, 600);
    expect(capturedSplats).toHaveLength(0);
  });

  it('emits splats when hand moves significantly', () => {
    const lm1 = makeLandmarks(100, 300);
    const lm2 = makeLandmarks(200, 300); // moved 100px right
    const splat = (x: number, y: number) => { capturedSplats.push({ x, y }); };

    hf.update(lm1, false, splat, 800, 600); // seed prevPosition
    capturedSplats = [];
    hf.update(lm2, false, splat, 800, 600);
    // Should emit at least one splat (palm + fingertips = 6)
    expect(capturedSplats.length).toBeGreaterThan(0);
  });

  it('emits pinch splat at index fingertip (landmark 8)', () => {
    const lm = makeLandmarks(400, 300);
    lm[8] = { x: 450, y: 250 }; // distinct fingertip position

    const splatArgs: Array<[number, number]> = [];
    const splat = (x: number, y: number) => { splatArgs.push([x, y]); };

    // Seed prev position with big movement
    const prevLm = makeLandmarks(200, 200);
    hf.update(prevLm, true, splat, 800, 600);
    splatArgs.length = 0;

    hf.update(lm, true, splat, 800, 600);
    // Pinch: 1 splat at landmark 8 = (450/800, 250/600)
    expect(splatArgs).toHaveLength(1);
    expect(splatArgs[0][0]).toBeCloseTo(450 / 800, 3);
    expect(splatArgs[0][1]).toBeCloseTo(250 / 600, 3);
  });

  it('resets state correctly', () => {
    const lm = makeLandmarks(400, 300);
    const splat = (x: number, y: number) => { capturedSplats.push({ x, y }); };

    hf.update(lm, false, splat, 800, 600);
    hf.reset();
    capturedSplats = [];
    // After reset, same landmarks should be treated as first frame (no velocity)
    hf.update(lm, false, splat, 800, 600);
    // No splat on first call after reset (prev is null → speed=0 or set to 0)
    expect(capturedSplats).toHaveLength(0);
  });
});
