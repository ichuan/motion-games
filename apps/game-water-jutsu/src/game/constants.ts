// Game balance constants for Water Jutsu Striker.
// Tune these to adjust difficulty, feel, and performance.

/** Total game duration in seconds. */
export const GAME_DURATION = 60;

/** Countdown from this value before game starts. */
export const COUNTDOWN_FROM = 3;

// ── Target parameters ────────────────────────────────────────────────────────

/** Base collision radius for fire seal targets (pixels, screen-space). */
export const FIRE_SEAL_RADIUS = 44;

/** Radius for fire ninja targets (slightly larger hit area for higher-scoring target). */
export const FIRE_NINJA_RADIUS = 52;

/** Base travel speed for fire seal (pixels/second). */
export const FIRE_SEAL_SPEED = 200;

/** Base travel speed for fire ninja. */
export const FIRE_NINJA_SPEED = 280;

/** Score for hitting a fire seal. */
export const SCORE_SEAL = 1;

/** Score for hitting a fire ninja. */
export const SCORE_NINJA = 5;

/** Score penalty when a target escapes off screen. */
export const SCORE_MISS = -1;

// ── Spawning schedule ────────────────────────────────────────────────────────

/** Time (seconds) between spawns in the first phase (0 to SPEED_UP_AT). */
export const SPAWN_INTERVAL_EARLY = 2.0;

/** Time between spawns in the faster second phase. */
export const SPAWN_INTERVAL_LATE = 1.0;

/** Game time at which the pace increases. */
export const SPEED_UP_AT = 30;

/** Game time at which fire ninjas start appearing. */
export const NINJA_START_AT = 20;

/** Probability [0..1] of a ninja spawn (after NINJA_START_AT). */
export const NINJA_PROB = 0.2;

// ── Hand / collision parameters ──────────────────────────────────────────────

/** Effective hand interaction radius (pixels). Stacked with target radius. */
export const HAND_HIT_RADIUS = 36;

/** Minimum hand speed (px/s) to count as a hit. Prevents accidental triggers. */
export const MIN_HIT_SPEED = 120;

// ── Fluid splat parameters ───────────────────────────────────────────────────

/** Velocity multiplier applied to hand motion before injecting into fluid. */
export const FLUID_VELOCITY_SCALE = 5000;

/** Radius for "open palm" splat (normalized fluid-space). */
export const FLUID_RADIUS_OPEN = 0.14;

/** Radius for "pinch" splat — smaller, more concentrated. */
export const FLUID_RADIUS_PINCH = 0.06;

/** Primary water dye color: bright cyan [R, G, B] in [0,1]. */
export const WATER_COLOR_PRIMARY: [number, number, number] = [0.0, 0.72, 1.0];

/** Secondary water dye color: lighter blue for variety. */
export const WATER_COLOR_SECONDARY: [number, number, number] = [0.15, 0.55, 0.95];

/** Steam/impact dye color: near-white. */
export const WATER_COLOR_STEAM: [number, number, number] = [0.85, 0.97, 1.0];

// ── Visual effects ───────────────────────────────────────────────────────────

/** Duration of the screen shake effect on ninja hit (seconds). */
export const SHAKE_DURATION = 0.3;

/** Amplitude of screen shake (pixels). */
export const SHAKE_AMPLITUDE = 12;

/** How long floating score text stays visible (seconds). */
export const FLOAT_TEXT_DURATION = 0.8;
