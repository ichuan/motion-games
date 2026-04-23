// Unit tests for FluidSim — logic-level checks that don't require a real WebGL context.
// These verify configuration defaults, resize, dispose, and splat queuing behavior.
// Run: node --experimental-vm-modules node_modules/.bin/vitest run

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Three.js so tests run in Node without a GPU ──────────────────────────
vi.mock('three', async () => {
  class FakeTex { dispose = vi.fn(); }
  class FakeRT {
    texture = new FakeTex();
    dispose = vi.fn();
    clone() { return new FakeRT(); }
  }
  class FakeMaterial {
    uniforms: Record<string, { value: unknown }> = {};
    dispose = vi.fn();
  }
  class FakeMesh { material: unknown = null; }
  class FakeScene { add = vi.fn(); }

  return {
    WebGLRenderer: vi.fn(() => ({
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      setRenderTarget: vi.fn(),
      setClearColor: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
      autoClear: true,
      dispose: vi.fn(),
    })),
    WebGLRenderTarget: vi.fn(() => new FakeRT()),
    ShaderMaterial: vi.fn(() => new FakeMaterial()),
    PlaneGeometry: vi.fn(),
    Mesh: vi.fn(() => new FakeMesh()),
    Scene: vi.fn(() => new FakeScene()),
    OrthographicCamera: vi.fn(),
    Vector2: vi.fn((x, y) => ({ x, y })),
    Vector3: vi.fn((x, y, z) => ({ x, y, z })),
    HalfFloatType: 'HalfFloat',
    RGBAFormat: 'RGBA',
    LinearFilter: 'Linear',
    NearestFilter: 'Nearest',
    ClampToEdgeWrapping: 'Clamp',
  };
});

import { FluidSim } from '../FluidSim';

function makeCanvas(): HTMLCanvasElement {
  return {
    clientWidth: 800,
    clientHeight: 600,
    getContext: vi.fn(),
  } as unknown as HTMLCanvasElement;
}

describe('FluidSim — configuration defaults', () => {
  it('applies default config values', () => {
    const sim = new FluidSim(makeCanvas());
    // @ts-expect-error — accessing private for test
    expect(sim.cfg.simRes).toBe(128);
    // @ts-expect-error
    expect(sim.cfg.dyeRes).toBe(512);
    // @ts-expect-error
    expect(sim.cfg.pressureIter).toBe(20);
    // @ts-expect-error
    expect(sim.cfg.curl).toBe(28);
  });

  it('overrides config values', () => {
    const sim = new FluidSim(makeCanvas(), { simRes: 64, dyeRes: 256, curl: 15 });
    // @ts-expect-error
    expect(sim.cfg.simRes).toBe(64);
    // @ts-expect-error
    expect(sim.cfg.dyeRes).toBe(256);
    // @ts-expect-error
    expect(sim.cfg.curl).toBe(15);
  });
});

describe('FluidSim — splat queuing', () => {
  it('queues splats and clears them on step', () => {
    const sim = new FluidSim(makeCanvas());
    sim.splat(0.5, 0.5, 100, -50, [0, 0.6, 1]);
    sim.splat(0.3, 0.7,  50,  80, [1, 0.9, 0.8]);
    // @ts-expect-error
    expect(sim.pendingSplats.length).toBe(2);

    sim.step(0.016);
    // @ts-expect-error
    expect(sim.pendingSplats.length).toBe(0);
  });

  it('does not queue splats after dispose', () => {
    const sim = new FluidSim(makeCanvas());
    sim.dispose();
    sim.splat(0.5, 0.5, 10, 10, [1, 1, 1]);
    // @ts-expect-error
    expect(sim.pendingSplats.length).toBe(0);
  });
});

describe('FluidSim — resize', () => {
  it('updates internal canvas dimensions', () => {
    const sim = new FluidSim(makeCanvas());
    sim.resize(1920, 1080);
    // @ts-expect-error
    expect(sim.canvasWidth).toBe(1920);
    // @ts-expect-error
    expect(sim.canvasHeight).toBe(1080);
  });

  it('computes correct aspect ratio', () => {
    const sim = new FluidSim(makeCanvas());
    sim.resize(1920, 1080);
    expect(sim.aspectRatio).toBeCloseTo(1920 / 1080, 3);
  });
});

describe('FluidSim — dispose', () => {
  it('marks disposed and ignores further step/render calls', () => {
    const sim = new FluidSim(makeCanvas());
    sim.dispose();
    // @ts-expect-error
    expect(sim.disposed).toBe(true);
    // Should not throw
    expect(() => sim.step(0.016)).not.toThrow();
    expect(() => sim.render()).not.toThrow();
  });

  it('disposes render targets', () => {
    const sim = new FluidSim(makeCanvas());
    // @ts-expect-error
    const velDispose = vi.spyOn(sim.velocity, 'dispose');
    sim.dispose();
    expect(velDispose).toHaveBeenCalled();
  });
});
