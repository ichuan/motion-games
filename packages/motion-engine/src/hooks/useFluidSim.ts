// React hook wrapping FluidSim lifecycle: creation, resize, and disposal.
// Exposes a `splat` callback and a ref to the canvas element.
//
// Usage:
//   const { canvasRef, splat } = useFluidSim(config);
//   // Attach canvasRef to a <canvas> element.
//   // Call splat(x, y, dx, dy, color, radius) from gesture handlers.
//   // Call step(dt) + render() from your game loop (e.g., PixiJS useTick).

import { useRef, useEffect, useCallback } from 'react';
import { FluidSim } from '../fluid/FluidSim';
import type { FluidConfig } from '../fluid/FluidSim';

export interface UseFluidSimReturn {
  /** Attach this ref to the <canvas> element that Three.js renders to. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Inject a velocity+dye impulse. Safe to call before the canvas is ready. */
  splat: (x: number, y: number, dx: number, dy: number, color: [number, number, number], radius?: number) => void;
  /** Advance the simulation by dt (seconds). Call from the game loop. */
  step: (dt: number) => void;
  /** Render the current dye field to the fluid canvas. Call from the game loop. */
  render: () => void;
}

export function useFluidSim(config?: FluidConfig): UseFluidSimReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef    = useRef<FluidSim | null>(null);

  // Initialize FluidSim once the canvas is mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sim = new FluidSim(canvas, config);
    simRef.current = sim;

    // Handle WebGL context loss (common on iOS Safari when tab goes to background)
    function onContextLost(e: Event) {
      e.preventDefault();
      simRef.current = null;
    }
    function onContextRestored() {
      if (canvasRef.current) {
        simRef.current = new FluidSim(canvasRef.current, config);
      }
    }
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    // Resize handler
    function onResize() {
      simRef.current?.resize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('resize', onResize);
      simRef.current?.dispose();
      simRef.current = null;
    };
    // config is intentionally not in deps: FluidSim is created once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const splat = useCallback(
    (x: number, y: number, dx: number, dy: number, color: [number, number, number], radius?: number) => {
      simRef.current?.splat(x, y, dx, dy, color, radius);
    },
    [],
  );

  const step = useCallback((dt: number) => {
    simRef.current?.step(dt);
  }, []);

  const render = useCallback(() => {
    simRef.current?.render();
  }, []);

  return { canvasRef, splat, step, render };
}
