// GPU Stable Fluids simulation using Three.js WebGLRenderTarget ping-pong buffers.
// Shader pipeline derived from PavelDoGreat/WebGL-Fluid-Simulation (MIT License).
// See ./LICENSE-NOTICE.md for full attribution.
//
// Usage:
//   const sim = new FluidSim(canvas, { simRes: 128, dyeRes: 512 });
//   sim.splat(x, y, dx, dy, [r, g, b], radius); // call from hand tracking
//   sim.step(dt);   // each frame
//   sim.render();   // each frame
//   sim.dispose();  // on unmount

import * as THREE from 'three';
import { vertexSrc }           from './shaders/vertex';
import { advectionSrc }        from './shaders/advection';
import { curlSrc }             from './shaders/curl';
import { vorticitySrc }        from './shaders/vorticity';
import { divergenceSrc }       from './shaders/divergence';
import { pressureSrc }         from './shaders/pressure';
import { clearSrc }            from './shaders/clear';
import { gradientSubtractSrc } from './shaders/gradientSubtract';
import { splatSrc }            from './shaders/splat';
import { displaySrc }          from './shaders/display';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface FluidConfig {
  /** Velocity/pressure field resolution (power of 2). Default 128. */
  simRes?: number;
  /** Dye (color) field resolution (power of 2). Default 512. */
  dyeRes?: number;
  /** Jacobi pressure iterations per frame. Default 20. */
  pressureIter?: number;
  /** Velocity dissipation: higher = fluid loses speed faster. Default 0.2. */
  velocityDissipation?: number;
  /** Dye dissipation: higher = color fades faster. Default 0.9. */
  densityDissipation?: number;
  /** Vorticity confinement strength. Higher = more whirlpool-like. Default 28. */
  curl?: number;
  /** Pressure warm-start factor [0..1]. Default 0.8. */
  pressureDecay?: number;
}

export interface FluidSplat {
  x: number;                     // normalized [0, 1]
  y: number;                     // normalized [0, 1]
  dx: number;                    // velocity delta x (scaled)
  dy: number;                    // velocity delta y (scaled)
  color: [number, number, number]; // RGB [0, 1]
  radius?: number;               // Gaussian radius (normalized). Default 0.12.
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Double-buffered render target for ping-pong simulation passes. */
class DoubleRT {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  constructor(
    width: number,
    height: number,
    type: THREE.TextureDataType = THREE.HalfFloatType,
  ) {
    const opts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      stencilBuffer: false,
      depthBuffer: false,
    };
    this.read  = new THREE.WebGLRenderTarget(width, height, opts);
    this.write = new THREE.WebGLRenderTarget(width, height, opts);
  }

  swap() {
    [this.read, this.write] = [this.write, this.read];
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}

function createSingleRT(
  w: number,
  h: number,
  type: THREE.TextureDataType = THREE.HalfFloatType,
): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    stencilBuffer: false,
    depthBuffer: false,
  });
}

function createPass(fragmentSrc: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vertexSrc,
    fragmentShader: fragmentSrc,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
}

// Correct splat radius for non-square canvas aspect ratios
function splatRadius(radius: number, aspectRatio: number): number {
  return aspectRatio > 1 ? radius * aspectRatio : radius;
}

// ─── FluidSim ────────────────────────────────────────────────────────────────

export class FluidSim {
  private renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.OrthographicCamera;
  private mesh:     THREE.Mesh;

  private velocity:   DoubleRT;
  private dye:        DoubleRT;
  private pressure:   DoubleRT;
  private divergence: THREE.WebGLRenderTarget;
  private curlRT:     THREE.WebGLRenderTarget;

  private advectionPass:        THREE.ShaderMaterial;
  private curlPass:             THREE.ShaderMaterial;
  private vorticityPass:        THREE.ShaderMaterial;
  private divergencePass:       THREE.ShaderMaterial;
  private pressurePass:         THREE.ShaderMaterial;
  private clearPass:            THREE.ShaderMaterial;
  private gradientSubtractPass: THREE.ShaderMaterial;
  private splatPass:            THREE.ShaderMaterial;
  private displayPass:          THREE.ShaderMaterial;

  private cfg: Required<FluidConfig>;
  private pendingSplats: FluidSplat[] = [];
  private canvasWidth  = 0;
  private canvasHeight = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, config: FluidConfig = {}) {
    this.cfg = {
      simRes:               config.simRes               ?? 128,
      dyeRes:               config.dyeRes               ?? 512,
      pressureIter:         config.pressureIter         ?? 20,
      velocityDissipation:  config.velocityDissipation  ?? 0.2,
      densityDissipation:   config.densityDissipation   ?? 0.9,
      curl:                 config.curl                 ?? 28,
      pressureDecay:        config.pressureDecay        ?? 0.8,
    };

    this.canvasWidth  = canvas.clientWidth  || window.innerWidth;
    this.canvasHeight = canvas.clientHeight || window.innerHeight;

    // Three.js renderer — alpha:true keeps the canvas background transparent
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(1); // fluid simulation always at 1:1
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
    this.renderer.autoClear = false;

    // Full-screen quad — maps to NDC [-1,1] via orthographic camera
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene  = new THREE.Scene();
    const quad  = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(quad);
    this.mesh = quad;

    const { simRes, dyeRes } = this.cfg;

    // Render targets
    this.velocity   = new DoubleRT(simRes, simRes);
    this.dye        = new DoubleRT(dyeRes, dyeRes);
    this.pressure   = new DoubleRT(simRes, simRes);
    this.divergence = createSingleRT(simRes, simRes);
    this.curlRT     = createSingleRT(simRes, simRes);

    // Shader passes
    this.advectionPass        = createPass(advectionSrc);
    this.curlPass             = createPass(curlSrc);
    this.vorticityPass        = createPass(vorticitySrc);
    this.divergencePass       = createPass(divergenceSrc);
    this.pressurePass         = createPass(pressureSrc);
    this.clearPass            = createPass(clearSrc);
    this.gradientSubtractPass = createPass(gradientSubtractSrc);
    this.splatPass            = createPass(splatSrc);
    this.displayPass          = createPass(displaySrc);
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /** Queue a Gaussian velocity+dye impulse at the given normalized position. */
  splat(x: number, y: number, dx: number, dy: number, color: [number, number, number], radius = 0.12): void {
    if (this.disposed) return;
    this.pendingSplats.push({ x, y, dx, dy, color, radius });
  }

  /** Advance the simulation by dt seconds. Call once per frame. */
  step(dt: number): void {
    if (this.disposed) return;
    dt = Math.min(dt, 0.016666); // cap at ~60fps equivalent

    const { simRes, dyeRes, pressureIter, velocityDissipation, densityDissipation, curl, pressureDecay } = this.cfg;
    const simTex = new THREE.Vector2(1 / simRes, 1 / simRes);
    const dyeTex = new THREE.Vector2(1 / dyeRes, 1 / dyeRes);

    // 1. Apply all pending hand-gesture splats
    for (const s of this.pendingSplats) this._applySplat(s);
    this.pendingSplats = [];

    // 2. Compute curl (vorticity field)
    this._blit(this.curlPass, {
      uVelocity: this.velocity.read.texture,
      texelSize: simTex,
    }, this.curlRT);

    // 3. Vorticity confinement — amplifies swirling to add water-like detail
    this._blit(this.vorticityPass, {
      uVelocity: this.velocity.read.texture,
      uCurl:     this.curlRT.texture,
      texelSize: simTex,
      curl,
      dt,
    }, this.velocity.write);
    this.velocity.swap();

    // 4. Divergence of velocity
    this._blit(this.divergencePass, {
      uVelocity: this.velocity.read.texture,
      texelSize: simTex,
    }, this.divergence);

    // 5. Warm-start pressure: carry 80% of previous solution into this frame
    this._blit(this.clearPass, {
      uTexture: this.pressure.read.texture,
      value:    pressureDecay,
    }, this.pressure.write);
    this.pressure.swap();

    // 6. Jacobi pressure solve (iterative)
    for (let i = 0; i < pressureIter; i++) {
      this._blit(this.pressurePass, {
        uPressure:   this.pressure.read.texture,
        uDivergence: this.divergence.texture,
        texelSize:   simTex,
      }, this.pressure.write);
      this.pressure.swap();
    }

    // 7. Subtract pressure gradient to project velocity to divergence-free field
    this._blit(this.gradientSubtractPass, {
      uPressure: this.pressure.read.texture,
      uVelocity: this.velocity.read.texture,
      texelSize: simTex,
    }, this.velocity.write);
    this.velocity.swap();

    // 8. Advect velocity along itself
    this._blit(this.advectionPass, {
      uVelocity:    this.velocity.read.texture,
      uSource:      this.velocity.read.texture,
      texelSize:    simTex,
      dyeTexelSize: simTex,
      dt,
      dissipation:  velocityDissipation,
    }, this.velocity.write);
    this.velocity.swap();

    // 9. Advect dye along velocity
    this._blit(this.advectionPass, {
      uVelocity:    this.velocity.read.texture,
      uSource:      this.dye.read.texture,
      texelSize:    simTex,
      dyeTexelSize: dyeTex,
      dt,
      dissipation:  densityDissipation,
    }, this.dye.write);
    this.dye.swap();
  }

  /** Render the dye field to the canvas with water color mapping. */
  render(): void {
    if (this.disposed) return;
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this._blit(this.displayPass, {
      uDye:      this.dye.read.texture,
      uVelocity: this.velocity.read.texture,
    }, null);
  }

  /** Update canvas size when the window resizes. */
  resize(width: number, height: number): void {
    if (this.disposed) return;
    this.canvasWidth  = width;
    this.canvasHeight = height;
    this.renderer.setSize(width, height, false);
  }

  /** Clean up all GPU resources. Call when the component unmounts. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.velocity.dispose();
    this.dye.dispose();
    this.pressure.dispose();
    this.divergence.dispose();
    this.curlRT.dispose();
    [
      this.advectionPass, this.curlPass, this.vorticityPass,
      this.divergencePass, this.pressurePass, this.clearPass,
      this.gradientSubtractPass, this.splatPass, this.displayPass,
    ].forEach(m => m.dispose());
    this.renderer.dispose();
  }

  /** Current canvas aspect ratio. */
  get aspectRatio(): number {
    return this.canvasHeight > 0 ? this.canvasWidth / this.canvasHeight : 1;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /** Render a pass with the given uniforms to a target (null = screen). */
  private _blit(
    material: THREE.ShaderMaterial,
    uniforms: Record<string, unknown>,
    target: THREE.WebGLRenderTarget | null,
  ): void {
    for (const [key, value] of Object.entries(uniforms)) {
      if (!material.uniforms[key]) {
        material.uniforms[key] = { value };
      } else {
        material.uniforms[key].value = value;
      }
    }
    this.mesh.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  /** Apply a single splat to velocity and dye render targets. */
  private _applySplat(s: FluidSplat): void {
    const ar     = this.aspectRatio;
    const radius = splatRadius(s.radius ?? 0.12, ar);

    // Inject velocity impulse
    this._blit(this.splatPass, {
      uTarget:     this.velocity.read.texture,
      aspectRatio: ar,
      point:       new THREE.Vector2(s.x, s.y),
      color:       new THREE.Vector3(s.dx, s.dy, 0),
      radius,
    }, this.velocity.write);
    this.velocity.swap();

    // Inject dye color
    this._blit(this.splatPass, {
      uTarget:     this.dye.read.texture,
      aspectRatio: ar,
      point:       new THREE.Vector2(s.x, s.y),
      color:       new THREE.Vector3(s.color[0], s.color[1], s.color[2]),
      radius,
    }, this.dye.write);
    this.dye.swap();
  }
}
