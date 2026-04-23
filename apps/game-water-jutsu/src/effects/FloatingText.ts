// FloatingText: score text that floats upward and fades out on hit.
// Renders using PixiJS Text objects.

import * as PIXI from 'pixi.js';
import { FLOAT_TEXT_DURATION } from '../game/constants';

interface TextEntry {
  text: PIXI.Text;
  vy: number;     // upward velocity
  life: number;   // [0,1]
}

export class FloatingText {
  private entries: TextEntry[] = [];
  private container: PIXI.Container;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  spawn(msg: string, x: number, y: number, color = '#FFFFFF'): void {
    const text = new PIXI.Text({
      text: msg,
      style: {
        fontFamily: 'Arial Black, sans-serif',
        fontSize:   32,
        fontWeight: 'bold',
        fill:       color,
        stroke:     { color: '#000000', width: 4 },
        dropShadow: {
          color: '#000000',
          blur: 4,
          distance: 2,
          alpha: 0.6,
        },
      },
    });
    text.anchor.set(0.5, 0.5);
    text.x = x;
    text.y = y;
    this.container.addChild(text);

    this.entries.push({ text, vy: -80, life: 1 });
  }

  update(dt: number): void {
    const decay = 1 / FLOAT_TEXT_DURATION;

    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      e.life -= decay * dt;

      if (e.life <= 0) {
        this.container.removeChild(e.text);
        this.entries.splice(i, 1);
        continue;
      }

      e.text.y    += e.vy * dt;
      e.text.alpha = Math.max(0, e.life);
      // Float-up deceleration
      e.vy = e.vy * (1 - dt * 4);
    }
  }

  clear(): void {
    for (const e of this.entries) {
      this.container.removeChild(e.text);
    }
    this.entries.length = 0;
  }
}
