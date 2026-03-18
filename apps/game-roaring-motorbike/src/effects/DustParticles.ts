interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class DustParticleSystem {
  particles: Particle[] = [];

  emit(x: number, y: number, speedRatio: number) {
    const count = Math.floor(1 + speedRatio * 3);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: Math.random() * 30 + 10,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(g: any) {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      g.circle(p.x, p.y, p.size).fill({ color: 0xBDBDBD, alpha: alpha * 0.6 });
    }
  }
}
