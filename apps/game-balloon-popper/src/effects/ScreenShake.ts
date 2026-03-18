export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  offsetX = 0;
  offsetY = 0;

  trigger(intensity = 8, duration = 0.15) {
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt: number) {
    if (this.elapsed >= this.duration) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.elapsed += dt;
    const progress = this.elapsed / this.duration;
    const decay = 1 - progress;
    this.offsetX = (Math.random() - 0.5) * 2 * this.intensity * decay;
    this.offsetY = (Math.random() - 0.5) * 2 * this.intensity * decay;
  }

  get isShaking() {
    return this.elapsed < this.duration;
  }
}
