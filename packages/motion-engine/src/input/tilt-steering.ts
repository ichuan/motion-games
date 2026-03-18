const DEFAULT_DEAD_ZONE = 0.05; // ~3 degrees
const DEFAULT_MAX_TILT = 0.35; // ~20 degrees

export class TiltSteering {
  constructor(
    private deadZone = DEFAULT_DEAD_ZONE,
    private maxTilt = DEFAULT_MAX_TILT,
  ) {}

  /** Input tiltAngle (radians), output -1 to 1 steering value */
  update(tiltAngle: number): number {
    if (!Number.isFinite(tiltAngle)) return 0;
    const abs = Math.abs(tiltAngle);
    if (abs < this.deadZone) return 0;
    const range = this.maxTilt - this.deadZone;
    const magnitude = Math.min(abs - this.deadZone, range) / range;
    return Math.sign(tiltAngle) * magnitude;
  }
}
