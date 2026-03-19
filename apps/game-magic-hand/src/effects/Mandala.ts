import type { Graphics } from 'pixi.js';

function drawPolygon(g: Graphics, cx: number, cy: number, radius: number, sides: number, rotation: number, color: number, alpha: number) {
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = step * i + rotation;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath().stroke({ color, width: 1.5, alpha });
}

export function drawMandala(g: Graphics, cx: number, cy: number, radius: number, time: number) {
  const r1 = radius * 1.3;
  const r2 = radius * 1.0;
  const r3 = radius * 0.65;

  // Outer rings
  g.circle(cx, cy, r1).stroke({ color: 0x00FFFF, width: 1.5, alpha: 0.5 });
  g.circle(cx, cy, r2).stroke({ color: 0x88CCFF, width: 1, alpha: 0.35 });
  g.circle(cx, cy, r3).stroke({ color: 0xAADDFF, width: 1, alpha: 0.25 });

  // Rotating hexagon
  drawPolygon(g, cx, cy, r2, 6, time * 0.5, 0x00FFFF, 0.45);
  // Counter-rotating triangle
  drawPolygon(g, cx, cy, r3, 3, -time * 0.8, 0xFFFFFF, 0.3);
  // Slower octagon
  drawPolygon(g, cx, cy, r1 * 0.95, 8, time * 0.2, 0x4488FF, 0.2);

  // Decorative dots along outer ring
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i / 12) + time * 0.3;
    const dx = cx + Math.cos(angle) * r1;
    const dy = cy + Math.sin(angle) * r1;
    g.circle(dx, dy, 2).fill({ color: 0xFFFFFF, alpha: 0.5 });
  }

  // Inner rotating dots (opposite direction)
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i / 8) - time * 0.6;
    const dx = cx + Math.cos(angle) * r3;
    const dy = cy + Math.sin(angle) * r3;
    g.circle(dx, dy, 1.5).fill({ color: 0x00FFFF, alpha: 0.4 });
  }

  // Core glow dot
  g.circle(cx, cy, 5).fill({ color: 0xFFFFFF, alpha: 0.8 });
  g.circle(cx, cy, 3).fill({ color: 0x00FFFF, alpha: 0.9 });
}
