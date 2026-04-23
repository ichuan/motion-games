// FireTarget: a single fire seal or fire ninja target.
// Moves across the screen on a curved (parabolic) trajectory.
// When hit or escaped, transitions to a done state and is removed by the spawner.

import * as PIXI from 'pixi.js';
import {
  FIRE_SEAL_RADIUS, FIRE_NINJA_RADIUS,
  FIRE_SEAL_SPEED, FIRE_NINJA_SPEED,
} from './constants';

export type TargetKind = 'seal' | 'ninja';
export type TargetState = 'alive' | 'hit' | 'escaped' | 'dead';

/** Entry direction for incoming targets. */
export type TargetEntry = 'left' | 'right' | 'top';

export class FireTarget {
  readonly kind: TargetKind;
  readonly radius: number;

  // PixiJS display object
  container: PIXI.Container;
  private body: PIXI.Graphics;
  private hitFlash = 0; // seconds remaining on hit flash

  // Physics
  x: number;
  y: number;
  private vx: number;
  private vy: number;
  private gravity = 180; // px/s² downward pull for parabolic arc

  state: TargetState = 'alive';
  private age = 0;           // seconds alive
  private hitAge = 0;        // seconds since hit (for death animation)

  // Screen bounds (set on creation, used to detect escape)
  private sw: number;
  private sh: number;

  constructor(
    kind: TargetKind,
    entry: TargetEntry,
    screenWidth: number,
    screenHeight: number,
  ) {
    this.kind   = kind;
    this.radius = kind === 'ninja' ? FIRE_NINJA_RADIUS : FIRE_SEAL_RADIUS;
    this.sw     = screenWidth;
    this.sh     = screenHeight;

    const speed = kind === 'ninja' ? FIRE_NINJA_SPEED : FIRE_SEAL_SPEED;
    const speedVar = 0.75 + Math.random() * 0.5; // ±25% variance

    // Spawn position and velocity based on entry side
    if (entry === 'left') {
      this.x  = -this.radius;
      this.y  = screenHeight * (0.2 + Math.random() * 0.5);
      this.vx = speed * speedVar;
      this.vy = -speed * 0.3 * Math.random(); // slight upward arc
    } else if (entry === 'right') {
      this.x  = screenWidth + this.radius;
      this.y  = screenHeight * (0.2 + Math.random() * 0.5);
      this.vx = -speed * speedVar;
      this.vy = -speed * 0.3 * Math.random();
    } else {
      // top
      this.x  = screenWidth * (0.1 + Math.random() * 0.8);
      this.y  = -this.radius;
      this.vx = (Math.random() - 0.5) * speed * 0.6;
      this.vy = speed * speedVar * 0.5;
    }

    // Build PixiJS display
    this.container = new PIXI.Container();
    this.body = new PIXI.Graphics();
    this.container.addChild(this.body);
    this._drawBody(1);
  }

  update(dt: number): void {
    if (this.state === 'dead') return;

    this.age += dt;

    if (this.state === 'hit') {
      this.hitAge += dt;
      const progress = Math.min(this.hitAge / 0.25, 1);
      const scale    = 1 + progress * 0.6; // expand before disappearing
      const alpha    = 1 - progress;
      this.container.scale.set(scale);
      this.container.alpha = alpha;
      if (progress >= 1) this.state = 'dead';
      return;
    }

    // Physics update
    this.vy  += this.gravity * dt;
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;

    // Update container position (flip x for mirror-mode camera)
    this.container.x = this.x;
    this.container.y = this.y;

    // Pulsing flame animation
    const pulse = 0.9 + Math.sin(this.age * 8) * 0.1;
    this._drawBody(pulse);

    // Check if target has escaped off-screen (with margin)
    const margin = this.radius * 3;
    if (
      this.x < -margin || this.x > this.sw + margin ||
      this.y > this.sh + margin
    ) {
      this.state = 'escaped';
    }
  }

  markHit(): void {
    if (this.state !== 'alive') return;
    this.state   = 'hit';
    this.hitAge  = 0;
    this.hitFlash = 0.12;
    this._drawBody(1, true); // white flash
  }

  markEscaped(): void {
    if (this.state !== 'alive') return;
    this.state = 'escaped';
  }

  private _drawBody(scale: number, flash = false): void {
    const g = this.body;
    g.clear();

    const r = this.radius * scale;

    if (flash) {
      // White flash on hit
      g.circle(0, 0, r * 1.3).fill({ color: 0xFFFFFF, alpha: 0.9 });
      return;
    }

    if (this.kind === 'seal') {
      // Outer glow
      g.circle(0, 0, r * 1.4).fill({ color: 0xFF6600, alpha: 0.15 });
      g.circle(0, 0, r * 1.15).fill({ color: 0xFF4400, alpha: 0.3 });
      // Core
      g.circle(0, 0, r).fill({ color: 0xFF2200, alpha: 1.0 });
      // Inner bright
      g.circle(0, 0, r * 0.55).fill({ color: 0xFF8800, alpha: 0.9 });
      g.circle(0, 0, r * 0.25).fill({ color: 0xFFDD00, alpha: 1.0 });
    } else {
      // ninja — more elaborate
      // Purple-red aura
      g.circle(0, 0, r * 1.5).fill({ color: 0x880000, alpha: 0.15 });
      g.circle(0, 0, r * 1.2).fill({ color: 0xCC0000, alpha: 0.3 });
      // Core body (dark red)
      g.circle(0, 0, r).fill({ color: 0xAA0000, alpha: 1.0 });
      // Inner flame
      g.circle(0, 0, r * 0.65).fill({ color: 0xFF3300, alpha: 0.95 });
      g.circle(0, 0, r * 0.35).fill({ color: 0xFF8800, alpha: 1.0 });
      // Kanji-style cross marker
      g.rect(-r * 0.08, -r * 0.55, r * 0.16, r * 1.1).fill({ color: 0xFFCC00, alpha: 0.9 });
      g.rect(-r * 0.55, -r * 0.08, r * 1.1, r * 0.16).fill({ color: 0xFFCC00, alpha: 0.9 });
    }
  }
}
