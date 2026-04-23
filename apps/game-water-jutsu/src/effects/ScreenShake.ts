// ScreenShake: exposes offsetX/offsetY that should be applied to app.stage each frame.
// Caller is responsible for: `app.stage.position.set(shake.offsetX, shake.offsetY)`

import { SHAKE_DURATION, SHAKE_AMPLITUDE } from '../game/constants';

export class ScreenShake {
  offsetX = 0;
  offsetY = 0;

  private remaining = 0;
  private amplitude = SHAKE_AMPLITUDE;

  trigger(amplitudeOverride?: number): void {
    this.remaining = SHAKE_DURATION;
    this.amplitude = amplitudeOverride ?? SHAKE_AMPLITUDE;
  }

  update(dt: number): void {
    if (this.remaining <= 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    this.remaining -= dt;
    const decay   = Math.max(0, this.remaining / SHAKE_DURATION);
    const amp     = this.amplitude * decay;
    this.offsetX  = (Math.random() - 0.5) * amp * 2;
    this.offsetY  = (Math.random() - 0.5) * amp * 2;
  }
}
