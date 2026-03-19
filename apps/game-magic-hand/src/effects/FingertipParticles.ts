import { ParticleContainer, Particle, Texture } from 'pixi.js';

const FINGERTIP_IDS = [4, 8, 12, 16, 20];
const FINGER_COLORS = [0xFF4444, 0xFF8800, 0x44FF88, 0x4488FF, 0xAA44FF];

// Secondary glow colors (lighter/brighter variants)
const FINGER_GLOW = [0xFF8888, 0xFFBB44, 0x88FFBB, 0x88BBFF, 0xCC88FF];

interface PData {
  particle: Particle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startScale: number;
  rotSpeed: number;
}

const POOL_SIZE = 800;

// Soft glow texture (40x40)
function createGlowTexture(): Texture {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  // Outer soft glow
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return Texture.from({ resource: canvas, antialias: true });
}

// Small sparkle texture (16x16) for variety
function createSparkleTexture(): Texture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  // 4-point star shape
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i - Math.PI / 2;
    const outerR = half;
    const innerR = half * 0.2;
    const midAngle = angle + Math.PI / 4;
    ctx.lineTo(half + Math.cos(angle) * outerR, half + Math.sin(angle) * outerR);
    ctx.lineTo(half + Math.cos(midAngle) * innerR, half + Math.sin(midAngle) * innerR);
  }
  ctx.closePath();
  ctx.fill();

  return Texture.from({ resource: canvas, antialias: true });
}

export class FingertipParticles {
  readonly container: ParticleContainer;
  private pool: PData[] = [];
  private cursor = 0;
  private glowTex: Texture;
  private sparkleTex: Texture;

  constructor() {
    this.glowTex = createGlowTexture();
    this.sparkleTex = createSparkleTexture();

    this.container = new ParticleContainer({
      dynamicProperties: {
        position: true,
        color: true,
        vertex: true,
        rotation: true,
      },
    });

    for (let i = 0; i < POOL_SIZE; i++) {
      // Mix glow and sparkle textures: 70% glow, 30% sparkle
      const tex = i % 10 < 7 ? this.glowTex : this.sparkleTex;
      const p = new Particle({
        texture: tex,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
      });
      this.container.addParticle(p);
      this.pool.push({ particle: p, vx: 0, vy: 0, life: 0, maxLife: 0, startScale: 0, rotSpeed: 0 });
    }
  }

  emit(landmarks: { x: number; y: number }[]) {
    for (let fi = 0; fi < FINGERTIP_IDS.length; fi++) {
      const lm = landmarks[FINGERTIP_IDS[fi]];
      if (!lm || !Number.isFinite(lm.x)) continue;

      const emitCount = 3 + Math.floor(Math.random() * 3); // 3-5 per fingertip
      for (let n = 0; n < emitCount; n++) {
        const d = this.pool[this.cursor];
        this.cursor = (this.cursor + 1) % POOL_SIZE;

        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3; // faster spread
        d.vx = Math.cos(angle) * speed;
        d.vy = Math.sin(angle) * speed;
        d.life = 1;
        d.maxLife = 0.8 + Math.random() * 0.8; // longer life: 0.8-1.6s
        d.startScale = 0.2 + Math.random() * 0.35; // 0.2-0.55
        d.rotSpeed = (Math.random() - 0.5) * 4; // sparkle rotation

        const p = d.particle;
        // Slight random offset from fingertip for organic feel
        p.x = lm.x + (Math.random() - 0.5) * 8;
        p.y = lm.y + (Math.random() - 0.5) * 8;
        p.scaleX = d.startScale;
        p.scaleY = d.startScale;
        p.alpha = 0.85 + Math.random() * 0.15;
        p.rotation = Math.random() * Math.PI * 2;
        // Alternate between main color and glow color for shimmer
        p.tint = Math.random() < 0.7 ? FINGER_COLORS[fi] : FINGER_GLOW[fi];
      }
    }
  }

  update(dt: number) {
    for (const d of this.pool) {
      if (d.life <= 0) continue;
      d.life -= dt / d.maxLife;
      if (d.life <= 0) {
        d.life = 0;
        d.particle.alpha = 0;
        d.particle.scaleX = 0;
        d.particle.scaleY = 0;
        continue;
      }
      // Gentle upward drift instead of heavy gravity (magical feel)
      d.vy -= 8 * dt;
      // Slight horizontal wander
      d.vx += (Math.random() - 0.5) * 2 * dt;

      const p = d.particle;
      p.x += d.vx;
      p.y += d.vy;
      p.rotation += d.rotSpeed * dt;

      // Ease-out alpha: stays visible longer, fades at end
      const t = d.life;
      p.alpha = t * t * 0.9; // quadratic fade
      // Scale: slight grow then shrink
      const scaleCurve = t < 0.7 ? 1.0 : t * (1 / 0.7); // hold size, shrink at end
      p.scaleX = d.startScale * scaleCurve;
      p.scaleY = d.startScale * scaleCurve;
    }
    this.container.update();
  }

  destroy() {
    this.container.destroy({ children: true });
    this.glowTex.destroy(true);
    this.sparkleTex.destroy(true);
  }
}
