import type { BikeState } from './Bike';
import type { ObstacleState } from './Obstacle';
import type { CoinState } from './Coin';

const BIKE_DEPTH = 0.85; // bike's depth position on screen
const COLLISION_DEPTH_RANGE = 0.08; // how close in depth to trigger collision
const COLLISION_LANE_RANGE = 0.22;  // how close in lane position

export function checkObstacleCollision(
  bike: BikeState,
  obstacles: ObstacleState[],
): ObstacleState | null {
  for (const obs of obstacles) {
    if (!obs.alive) continue;
    const depthDiff = Math.abs(obs.depth - BIKE_DEPTH);
    const laneDiff = Math.abs(obs.laneX - bike.laneX);
    if (depthDiff < COLLISION_DEPTH_RANGE && laneDiff < COLLISION_LANE_RANGE) {
      return obs;
    }
  }
  return null;
}

export function checkCoinCollision(
  bike: BikeState,
  coins: CoinState[],
): CoinState | null {
  for (const coin of coins) {
    if (!coin.alive) continue;
    const depthDiff = Math.abs(coin.depth - BIKE_DEPTH);
    const laneDiff = Math.abs(coin.laneX - bike.laneX);
    if (depthDiff < COLLISION_DEPTH_RANGE && laneDiff < COLLISION_LANE_RANGE * 1.3) {
      return coin;
    }
  }
  return null;
}
