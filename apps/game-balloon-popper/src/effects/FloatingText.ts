interface FloatingTextItem {
  text: string;
  x: number;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  scale: number;
}

export class FloatingTextSystem {
  items: FloatingTextItem[] = [];

  add(text: string, x: number, y: number, color = '#FFD54F') {
    this.items.push({
      text, x, y,
      alpha: 1,
      life: 0,
      maxLife: 0.8,
      color,
      scale: 1,
    });
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life += dt;
      if (item.life >= item.maxLife) {
        this.items.splice(i, 1);
        continue;
      }
      item.y -= 60 * dt;
      item.alpha = 1 - item.life / item.maxLife;
      item.scale = 1 + item.life * 0.3;
    }
  }
}
