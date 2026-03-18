interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class PopParticleSystem {
  particles: Particle[] = [];

  emit(x: number, y: number, color: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
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
      p.vy += 300 * dt; // gravity
      p.alpha = 1 - p.life / p.maxLife;
      p.radius *= 0.98;
    }
  }

  draw(g: any) {
    for (const p of this.particles) {
      g.circle(p.x, p.y, p.radius).fill({ color: p.color, alpha: p.alpha });
    }
  }
}
