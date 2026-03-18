export const GAME_DURATION = 75;
export const COUNTDOWN_SECONDS = 3;

// Road geometry (ratios of screen dimensions)
export const ROAD_WIDTH_BOTTOM = 0.75;
export const ROAD_WIDTH_TOP = 0.2;
export const VANISH_Y = 0.2; // vanishing point at 20% from top

// Bike
export const BIKE_Y_RATIO = 0.8; // bike sits at 80% screen height
export const BIKE_WIDTH = 30;
export const BIKE_HEIGHT = 50;
export const BIKE_STEER_SPEED = 3.5; // lerp speed per second

// Speed
export const BASE_SPEED = 80;  // px/s at idle (volume=0)
export const MAX_SPEED = 450;  // px/s at full throttle

// Obstacles
export const OBSTACLE_SPAWN_START = 1.5; // seconds between spawns initially
export const OBSTACLE_SPAWN_END = 0.5;   // minimum spawn interval at max difficulty
export const OBSTACLE_WIDTH = 28;
export const OBSTACLE_HEIGHT = 45;

// Coins
export const COIN_SCORE = 50;
export const COIN_RADIUS = 12;
export const COIN_SPAWN_CHANCE = 0.4; // 40% chance per spawn cycle

// Crash
export const CRASH_SLOWDOWN = 0.3;   // speed multiplier during stun
export const CRASH_DURATION = 1.0;   // seconds
export const CRASH_SHAKE_INTENSITY = 10;
export const CRASH_SHAKE_DURATION = 0.2;
