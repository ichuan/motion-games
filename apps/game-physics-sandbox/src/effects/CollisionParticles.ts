interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export class CollisionParticleSystem {
  particles: Particle[] = [];

  emit(x: number, y: number, color: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4,
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
      p.vy += 200 * dt; // gravity
    }
  }

  draw(g: any) {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      const s = p.size * (1 - p.life / p.maxLife * 0.5);
      g.rect(p.x - s / 2, p.y - s / 2, s, s).fill({ color: p.color, alpha });
    }
  }
}
