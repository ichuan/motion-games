import {
  BALLOON_RADIUS_MIN, BALLOON_RADIUS_MAX,
  BALLOON_SPEED_MIN, BALLOON_SPEED_MAX,
  BALLOON_WOBBLE_AMP, BALLOON_WOBBLE_FREQ,
  BALLOON_COLORS, BOMB_CHANCE,
} from './constants';

export interface BalloonState {
  id: number;
  x: number;
  y: number;
  radius: number;
  vy: number;
  wobblePhase: number;
  wobbleAmp: number;
  baseX: number;
  color: number;
  type: 'normal' | 'bomb';
  alive: boolean;
  scale: number;
  breathPhase: number;
}

let nextId = 0;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function spawnBalloon(screenWidth: number, screenHeight: number): BalloonState {
  const isBomb = Math.random() < BOMB_CHANCE;
  const radius = rand(BALLOON_RADIUS_MIN, BALLOON_RADIUS_MAX);
  const x = rand(radius, screenWidth - radius);

  return {
    id: nextId++,
    x,
    y: screenHeight + radius + 20,
    radius,
    vy: -rand(BALLOON_SPEED_MIN, BALLOON_SPEED_MAX),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp: rand(BALLOON_WOBBLE_AMP * 0.5, BALLOON_WOBBLE_AMP),
    baseX: x,
    color: isBomb ? 0x444444 : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    type: isBomb ? 'bomb' : 'normal',
    alive: true,
    scale: 1,
    breathPhase: Math.random() * Math.PI * 2,
  };
}

export function updateBalloon(b: BalloonState, dt: number) {
  b.y += b.vy * dt;
  b.wobblePhase += dt * BALLOON_WOBBLE_FREQ * Math.PI * 2;
  b.x = b.baseX + Math.sin(b.wobblePhase) * b.wobbleAmp;
  b.breathPhase += dt * 3;
  b.scale = 1 + Math.sin(b.breathPhase) * 0.03;
}

export function isBalloonOffScreen(b: BalloonState): boolean {
  return b.y < -b.radius * 2;
}
