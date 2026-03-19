import { ParticleContainer, Particle, Texture } from 'pixi.js';

/* ── Finger tip landmark indices (MediaPipe Hand) ── */
const FINGERTIP_IDS = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
const FINGER_COLORS = [0xFF4444, 0xFF8800, 0x44FF88, 0x4488FF, 0xAA44FF];

/* ── Internal particle data (ring-buffer pool) ── */
interface PData {
  particle: Particle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startScale: number;
}

const POOL_SIZE = 500;

/* ── Build a 32x32 radial-gradient circle texture (once) ── */
function createCircleTexture(): Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from({ resource: canvas, antialias: true });
}

export class FingertipParticles {
  readonly container: ParticleContainer;
  private pool: PData[] = [];
  private cursor = 0;
  private tex: Texture;

  constructor() {
    this.tex = createCircleTexture();

    this.container = new ParticleContainer({
      texture: this.tex,
      dynamicProperties: {
        position: true,
        color: true,
        vertex: true,   // needed for scale changes
      },
    });

    // Pre-allocate particle pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = new Particle({
        texture: this.tex,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
      });
      this.container.addParticle(p);
      this.pool.push({ particle: p, vx: 0, vy: 0, life: 0, maxLife: 0, startScale: 0 });
    }
  }

  /* ── Emit particles for detected fingertips ── */
  emit(landmarks: { x: number; y: number }[]) {
    for (let fi = 0; fi < FINGERTIP_IDS.length; fi++) {
      const lm = landmarks[FINGERTIP_IDS[fi]];
      if (!lm || !Number.isFinite(lm.x)) continue;

      const emitCount = 2 + Math.floor(Math.random() * 2); // 2-3
      for (let n = 0; n < emitCount; n++) {
        const d = this.pool[this.cursor];
        this.cursor = (this.cursor + 1) % POOL_SIZE;

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        d.vx = Math.cos(angle) * speed;
        d.vy = Math.sin(angle) * speed;
        d.life = 1;
        d.maxLife = 0.6 + Math.random() * 0.6; // 0.6-1.2 s
        d.startScale = 0.3 + Math.random() * 0.4;

        const p = d.particle;
        p.x = lm.x;
        p.y = lm.y;
        p.scaleX = d.startScale;
        p.scaleY = d.startScale;
        p.alpha = 0.9;
        p.tint = FINGER_COLORS[fi];
      }
    }
  }

  /* ── Tick every frame (dt in seconds) ── */
  update(dt: number) {
    const gravity = 30;
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
      d.vy += gravity * dt;
      const p = d.particle;
      p.x += d.vx;
      p.y += d.vy;
      p.alpha = d.life * 0.9;
      const s = d.startScale * d.life;
      p.scaleX = s;
      p.scaleY = s;
    }
    this.container.update();
  }

  destroy() {
    this.container.destroy({ children: true });
    this.tex.destroy(true);
  }
}
