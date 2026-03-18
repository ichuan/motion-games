export const GAME_DURATION = 75; // seconds
export const COUNTDOWN_SECONDS = 3;

export const BALLOON_RADIUS_MIN = 30;
export const BALLOON_RADIUS_MAX = 50;
export const BALLOON_SPEED_MIN = 60;  // px/s upward
export const BALLOON_SPEED_MAX = 140;
export const BALLOON_WOBBLE_AMP = 20; // px
export const BALLOON_WOBBLE_FREQ = 2; // hz

export const SPAWN_INTERVAL_MIN = 0.6; // seconds
export const SPAWN_INTERVAL_MAX = 1.4;
export const BOMB_CHANCE = 0.15;
export const MAX_BALLOONS = 20;

export const SCORE_POP = 10;
export const SCORE_BOMB = -20;
export const COMBO_THRESHOLD = 3;
export const COMBO_BONUS = 5;

export const BALLOON_COLORS = [
  0xFF6B9D, // pink
  0xFF8A65, // coral
  0xFFD54F, // yellow
  0x81C784, // green
  0x64B5F6, // blue
  0xBA68C8, // purple
] as const;
