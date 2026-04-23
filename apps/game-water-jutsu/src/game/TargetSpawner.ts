// TargetSpawner manages the population of fire targets:
// - Spawns targets at a rate that increases with game time
// - Introduces fire ninjas after a threshold
// - Removes dead targets from the scene
// - Reports escaped targets for score penalty

import * as PIXI from 'pixi.js';
import { FireTarget } from './FireTarget';
import type { TargetEntry } from './FireTarget';
import {
  SPAWN_INTERVAL_EARLY, SPAWN_INTERVAL_LATE, SPEED_UP_AT,
  NINJA_START_AT, NINJA_PROB,
} from './constants';

export class TargetSpawner {
  readonly targets: FireTarget[] = [];
  private spawnTimer = 0;
  private gameTime   = 0;

  private sw: number;
  private sh: number;
  private container: PIXI.Container;

  /** Called once per escaped target, passes the escaped FireTarget. */
  onEscape: (t: FireTarget) => void = () => {};

  constructor(container: PIXI.Container, screenWidth: number, screenHeight: number) {
    this.container = container;
    this.sw        = screenWidth;
    this.sh        = screenHeight;
  }

  update(dt: number): void {
    this.gameTime   += dt;
    this.spawnTimer += dt;

    const interval = this.gameTime < SPEED_UP_AT
      ? SPAWN_INTERVAL_EARLY
      : SPAWN_INTERVAL_LATE;

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawn();
    }

    // Update all targets and collect dead ones
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.update(dt);

      if (t.state === 'escaped') {
        this.onEscape(t);
        // Mark as dead so it gets removed next iteration
        this.targets.splice(i, 1);
        this.container.removeChild(t.container);
        continue;
      }

      if (t.state === 'dead') {
        this.container.removeChild(t.container);
        this.targets.splice(i, 1);
      }
    }
  }

  resize(sw: number, sh: number): void {
    this.sw = sw;
    this.sh = sh;
  }

  /** Remove all targets immediately (on game end). */
  clear(): void {
    for (const t of this.targets) {
      this.container.removeChild(t.container);
    }
    this.targets.length = 0;
    this.spawnTimer = 0;
    this.gameTime   = 0;
  }

  private _spawn(): void {
    const isNinja = this.gameTime > NINJA_START_AT && Math.random() < NINJA_PROB;
    const entries: TargetEntry[] = ['left', 'right', 'top'];
    const entry = entries[Math.floor(Math.random() * entries.length)];

    const target = new FireTarget(isNinja ? 'ninja' : 'seal', entry, this.sw, this.sh);
    this.targets.push(target);
    this.container.addChild(target.container);
  }
}
