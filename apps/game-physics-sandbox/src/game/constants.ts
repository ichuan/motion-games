export const GAME_DURATION = 60;
export const COUNTDOWN_SECONDS = 3;

// Physics
export const GRAVITY = 9.81;
export const PIXELS_PER_METER = 50; // 50px = 1m in Rapier

// Platform
export const PLATFORM_Y_RATIO = 0.85; // ground at 85% screen height
export const PLATFORM_THICKNESS = 20;

// Tower area (right side of screen)
export const TOWER_X_RATIO = 0.65; // tower center at 65% screen width

// Throwable area (left side)
export const THROWABLE_X_RATIO = 0.2;
export const MAX_THROWABLES = 3;

// Block sizes (in pixels)
export const BLOCK_W = 50;
export const BLOCK_H = 25;

// Scoring
export const SCORE_PER_BLOCK = 10;
export const FULL_CLEAR_BONUS = 100;

// Grab
export const GRAB_RADIUS = 60; // pixels
export const THROW_SPEED_MULTIPLIER = 8; // amplify hand velocity
export const VELOCITY_HISTORY_FRAMES = 5;

// Colors for tower blocks (per layer)
export const BLOCK_COLORS = [
  0xEF5350, 0xFFA726, 0xFFEE58, 0x66BB6A,
  0x42A5F5, 0xAB47BC, 0xEC407A, 0x26C6DA,
];

// Throwable colors
export const BALL_COLOR = 0xFF7043;
export const BOX_COLOR = 0x5C6BC0;
