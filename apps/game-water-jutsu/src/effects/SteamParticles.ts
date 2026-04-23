// SteamParticles: burst of white-blue steam particles emitted on target hit.
// Each particle is a PixiJS Graphics circle that fades and rises.

import * as PIXI from 'pixi.js';

interface SteamParticle {
  gfx: PIXI.Graphics;
  vx: number;
  vy: number;
  life: number;    // remaining life [0,1]
  decay: number;   // life units per second
  r: number;       // current radius
  maxR: number;
}

export class SteamParticles {
  private particles: SteamParticle[] = [];
  private container: PIXI.Container;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  /** Emit a burst of steam at (x, y). Larger burst for ninja hits. */
  burst(x: number, y: number, count = 16, scale = 1): void {
    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const speed  = (80 + Math.random() * 160) * scale;
      const maxR   = (5 + Math.random() * 8) * scale;

      const gfx = new PIXI.Graphics();
      gfx.circle(0, 0, maxR).fill({ color: 0xCCEEFF, alpha: 0.85 });
      gfx.x = x;
      gfx.y = y;
      this.container.addChild(gfx);

      this.particles.push({
        gfx,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 60 * scale, // slight upward bias
        life:  1,
        decay: 1.2 + Math.random() * 0.8,
        r:     maxR,
        maxR,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        this.container.removeChild(p.gfx);
        this.particles.splice(i, 1);
        continue;
      }

      p.gfx.x    += p.vx * dt;
      p.gfx.y    += p.vy * dt;
      p.vy       += 30 * dt; // gentle drag
      p.gfx.alpha = p.life;
      const r     = p.maxR * p.life;
      p.gfx.scale.set(r / p.maxR);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.container.removeChild(p.gfx);
    }
    this.particles.length = 0;
  }
}
