import { PhysicsWorld } from './PhysicsWorld';
import { BLOCK_W, BLOCK_H, BLOCK_COLORS, TOWER_X_RATIO, PLATFORM_Y_RATIO } from './constants';

export interface TowerBlock {
  handle: number;
  color: number;
  settled: boolean; // starts true, becomes false when toppled
}

/** Build a tower at the right side of the screen. Returns block handles. */
export function buildTower(
  world: PhysicsWorld,
  level: number,
  screenW: number,
  screenH: number,
): TowerBlock[] {
  const blocks: TowerBlock[] = [];
  const towerX = screenW * TOWER_X_RATIO;
  const groundY = screenH * PLATFORM_Y_RATIO;

  // Number of rows increases with level
  const rows = Math.min(3 + level, 10);
  // Blocks per row alternates: 3, 2, 3, 2... for interesting stacking
  const baseBlocksPerRow = level <= 2 ? 2 : 3;

  for (let row = 0; row < rows; row++) {
    const blocksInRow = row % 2 === 0 ? baseBlocksPerRow : Math.max(1, baseBlocksPerRow - 1);
    const rowWidth = blocksInRow * BLOCK_W;
    const startX = towerX - rowWidth / 2 + BLOCK_W / 2;
    const y = groundY - BLOCK_H / 2 - row * BLOCK_H;

    // Alternate orientation for odd rows (rotated 90°) at higher levels
    const rotated = level >= 3 && row % 2 === 1;

    for (let col = 0; col < blocksInRow; col++) {
      const x = startX + col * BLOCK_W;
      const color = BLOCK_COLORS[row % BLOCK_COLORS.length];
      const w = rotated ? BLOCK_H : BLOCK_W;
      const h = rotated ? BLOCK_W : BLOCK_H;
      const handle = world.addBox(x, y, w, h, color);
      blocks.push({ handle, color, settled: true });
    }
  }

  return blocks;
}

/** Check which blocks have fallen below the platform */
export function checkToppledBlocks(
  world: PhysicsWorld,
  blocks: TowerBlock[],
  screenH: number,
): TowerBlock[] {
  const threshold = screenH * PLATFORM_Y_RATIO + 30;
  const toppled: TowerBlock[] = [];

  for (const block of blocks) {
    if (!block.settled) continue;
    const info = world.getBody(block.handle);
    if (!info) continue;
    if (info.y > threshold) {
      block.settled = false;
      toppled.push(block);
    }
  }

  return toppled;
}

/** Check if all blocks in the tower are toppled */
export function isTowerCleared(blocks: TowerBlock[]): boolean {
  return blocks.every((b) => !b.settled);
}
