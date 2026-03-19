import { GRAVITY, PIXELS_PER_METER } from './constants';

// Types from rapier2d-compat — we import the module dynamically
type RAPIER = typeof import('@dimforge/rapier2d-compat');

export interface BodyInfo {
  handle: number;
  x: number;
  y: number;
  rotation: number;
  width: number;   // for rendering
  height: number;
  shape: 'box' | 'ball';
  color: number;
  isStatic: boolean;
}

export class PhysicsWorld {
  private RAPIER: RAPIER | null = null;
  private world: any = null;
  private bodies: Map<number, { body: any; info: BodyInfo }> = new Map();
  ready = false;

  async init() {
    const RAPIER = await import('@dimforge/rapier2d-compat');
    await RAPIER.init();
    this.RAPIER = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: GRAVITY });
    this.ready = true;
  }

  step(dt: number) {
    if (!this.world) return;
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }

  addBox(x: number, y: number, w: number, h: number, color: number, isStatic = false): number {
    if (!this.RAPIER || !this.world) return -1;
    const R = this.RAPIER;
    const ppm = PIXELS_PER_METER;

    const bodyDesc = isStatic
      ? R.RigidBodyDesc.fixed().setTranslation(x / ppm, y / ppm)
      : R.RigidBodyDesc.dynamic().setTranslation(x / ppm, y / ppm);
    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = R.ColliderDesc.cuboid(w / 2 / ppm, h / 2 / ppm)
      .setRestitution(0.2)
      .setFriction(0.6)
      .setDensity(isStatic ? 0 : 1.0);
    this.world.createCollider(colliderDesc, body);

    const handle = body.handle;
    this.bodies.set(handle, {
      body,
      info: { handle, x, y, rotation: 0, width: w, height: h, shape: 'box', color, isStatic },
    });
    return handle;
  }

  addBall(x: number, y: number, radius: number, color: number): number {
    if (!this.RAPIER || !this.world) return -1;
    const R = this.RAPIER;
    const ppm = PIXELS_PER_METER;

    const bodyDesc = R.RigidBodyDesc.dynamic().setTranslation(x / ppm, y / ppm);
    const body = this.world.createRigidBody(bodyDesc);

    const colliderDesc = R.ColliderDesc.ball(radius / ppm)
      .setRestitution(0.4)
      .setFriction(0.5)
      .setDensity(1.5);
    this.world.createCollider(colliderDesc, body);

    const handle = body.handle;
    this.bodies.set(handle, {
      body,
      info: { handle, x, y, rotation: 0, width: radius * 2, height: radius * 2, shape: 'ball', color, isStatic: false },
    });
    return handle;
  }

  addPlatform(x: number, y: number, w: number, h: number): number {
    return this.addBox(x, y, w, h, 0x795548, true);
  }

  setKinematic(handle: number) {
    const entry = this.bodies.get(handle);
    if (!entry || !this.RAPIER) return;
    entry.body.setBodyType(this.RAPIER.RigidBodyType.KinematicPositionBased, true);
  }

  setDynamic(handle: number, vx: number, vy: number) {
    const entry = this.bodies.get(handle);
    if (!entry || !this.RAPIER) return;
    const ppm = PIXELS_PER_METER;
    entry.body.setBodyType(this.RAPIER.RigidBodyType.Dynamic, true);
    entry.body.setLinvel({ x: vx / ppm, y: vy / ppm }, true);
  }

  moveKinematic(handle: number, x: number, y: number) {
    const entry = this.bodies.get(handle);
    if (!entry) return;
    const ppm = PIXELS_PER_METER;
    entry.body.setNextKinematicTranslation({ x: x / ppm, y: y / ppm });
  }

  removeBody(handle: number) {
    const entry = this.bodies.get(handle);
    if (!entry || !this.world) return;
    this.world.removeRigidBody(entry.body);
    this.bodies.delete(handle);
  }

  syncPositions() {
    const ppm = PIXELS_PER_METER;
    for (const [, entry] of this.bodies) {
      const pos = entry.body.translation();
      entry.info.x = pos.x * ppm;
      entry.info.y = pos.y * ppm;
      entry.info.rotation = entry.body.rotation();
    }
  }

  getBody(handle: number): BodyInfo | null {
    return this.bodies.get(handle)?.info ?? null;
  }

  getAllBodies(): BodyInfo[] {
    return Array.from(this.bodies.values()).map((e) => e.info);
  }

  getBodyCount(): number {
    return this.bodies.size;
  }

  clear() {
    if (!this.world) return;
    for (const [handle] of this.bodies) {
      const entry = this.bodies.get(handle);
      if (entry) this.world.removeRigidBody(entry.body);
    }
    this.bodies.clear();
  }

  dispose() {
    this.clear();
    this.world?.free();
    this.world = null;
  }
}
