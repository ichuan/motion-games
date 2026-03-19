import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import { useFaceTracking, SFX, unlockAudio } from '@motion-games/engine';
import { StartScreen } from './components/StartScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { HUD } from './components/HUD';
import { ResultScreen } from './components/ResultScreen';
import { useGameStore } from './store/useGameStore';
import { FloatingTextSystem } from './effects/FloatingText';
import {
  PILLAR_MIN_WIDTH, PILLAR_MAX_WIDTH,
  GAP_MIN, GAP_MAX, FIRST_PILLAR_WIDTH,
  STICK_GROW_SPEED,
  CHAR_SPEED, CHAR_FALL_SPEED,
  PERFECT_ZONE_RATIO,
  MOUTH_OPEN_THRESHOLD, MOUTH_CLOSE_THRESHOLD,
} from './game/constants';

extend({ Container, Graphics });

const NOOP_DRAW = () => {};

// ── Layout constants ──
const PLATFORM_Y_RATIO = 0.75; // platforms at 75% down the screen
const PILLAR_HEIGHT = 300;      // tall pillars extending below platform into the abyss
const STICK_WIDTH = 5;
const CHAR_SIZE = 22;

// ── Colors (warm, kid-friendly palette) ──
const SKY_TOP = 0x87CEEB;
const SKY_BOTTOM = 0xE0F0FF;
const CLOUD_COLOR = 0xFFFFFF;
const SUN_COLOR = 0xFFE082;
const SUN_GLOW = 0xFFF9C4;
const PILLAR_BODY = 0xD2691E;    // chocolate brown
const PILLAR_DARK = 0xA0522D;    // sienna
const PILLAR_TOP = 0x8FBC8F;     // dark sea green (grass top)
const PILLAR_GRASS = 0x90EE90;   // light green
const STICK_COLOR = 0x5D4037;    // dark brown (wood)
const STICK_STRIPE = 0x795548;   // lighter brown (wood grain)
const PERFECT_GOLD = 0xFFD700;
const ABYSS_TOP = 0x4A3728;
const ABYSS_BOTTOM = 0x1A1A1A;

// ── Types ──

interface Pillar {
  x: number;
  width: number;
}

type PhaseState = 'waiting' | 'growing' | 'falling' | 'walking' | 'transitioning' | 'dying';

// ── Cloud data ──
interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

function generateClouds(count: number): Cloud[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 3000 - 500,
    y: 20 + Math.random() * 120,
    scale: 0.5 + Math.random() * 0.8,
    speed: 8 + Math.random() * 15,
  }));
}

function drawCloud(g: any, x: number, y: number, s: number) {
  g.circle(x, y, 18 * s).fill({ color: CLOUD_COLOR, alpha: 0.9 });
  g.circle(x - 16 * s, y + 4 * s, 14 * s).fill({ color: CLOUD_COLOR, alpha: 0.9 });
  g.circle(x + 16 * s, y + 3 * s, 15 * s).fill({ color: CLOUD_COLOR, alpha: 0.9 });
  g.circle(x + 6 * s, y - 8 * s, 12 * s).fill({ color: CLOUD_COLOR, alpha: 0.9 });
}

// ── Cute character drawing ──
function drawCharacter(g: any, cx: number, cy: number, walking: boolean) {
  const headR = 10;
  const bodyH = 14;
  const headCY = cy - bodyH - headR;

  // Shadow
  g.ellipse(cx, cy + 2, 10, 3).fill({ color: 0x000000, alpha: 0.15 });

  // Body (round rectangle torso)
  g.roundRect(cx - 6, cy - bodyH, 12, bodyH, 3).fill({ color: 0xFF6B6B });

  // Legs
  const legAnim = walking ? Math.sin(Date.now() * 0.015) * 4 : 0;
  g.roundRect(cx - 5 + legAnim, cy, 4, 8, 2).fill({ color: 0x4A90D9 });
  g.roundRect(cx + 1 - legAnim, cy, 4, 8, 2).fill({ color: 0x4A90D9 });

  // Arms
  const armAnim = walking ? Math.sin(Date.now() * 0.015) * 3 : 0;
  g.roundRect(cx - 10, cy - bodyH + 2 + armAnim, 4, 8, 2).fill({ color: 0xFFDBB5 });
  g.roundRect(cx + 6, cy - bodyH + 2 - armAnim, 4, 8, 2).fill({ color: 0xFFDBB5 });

  // Head (skin)
  g.circle(cx, headCY, headR).fill({ color: 0xFFDBB5 });

  // Hat (cute red beanie)
  g.circle(cx, headCY - 3, headR + 1).fill({ color: 0xFF6B6B });
  g.rect(cx - headR - 1, headCY - 2, (headR + 1) * 2, headR + 2).fill({ color: 0xFFDBB5 });
  // Hat brim
  g.roundRect(cx - headR - 2, headCY - 3, (headR + 2) * 2, 4, 2).fill({ color: 0xE55B5B });
  // Hat pom-pom
  g.circle(cx, headCY - headR - 2, 3).fill({ color: 0xFFFFFF });

  // Eyes (big cute eyes)
  g.circle(cx - 4, headCY + 1, 3).fill({ color: 0xFFFFFF });
  g.circle(cx + 4, headCY + 1, 3).fill({ color: 0xFFFFFF });
  g.circle(cx - 4, headCY + 1, 1.8).fill({ color: 0x333333 });
  g.circle(cx + 4, headCY + 1, 1.8).fill({ color: 0x333333 });
  // Eye highlights
  g.circle(cx - 3, headCY, 0.8).fill({ color: 0xFFFFFF });
  g.circle(cx + 5, headCY, 0.8).fill({ color: 0xFFFFFF });

  // Mouth (tiny smile)
  g.moveTo(cx - 2, headCY + 5).quadraticCurveTo(cx, headCY + 7, cx + 2, headCY + 5)
    .stroke({ width: 1.2, color: 0x333333 });

  // Blush
  g.circle(cx - 7, headCY + 3, 2.5).fill({ color: 0xFF9999, alpha: 0.5 });
  g.circle(cx + 7, headCY + 3, 2.5).fill({ color: 0xFF9999, alpha: 0.5 });
}

// ── Game Renderer ──

function GameRenderer({
  pillarsRef,
  stickRef,
  charRef,
  cameraRef,
  phaseRef,
  mouthOpenRef,
  clouds,
}: {
  pillarsRef: React.RefObject<Pillar[]>;
  stickRef: React.RefObject<{ x: number; length: number; angle: number }>;
  charRef: React.RefObject<{ x: number; y: number; walking: boolean }>;
  cameraRef: React.RefObject<number>;
  phaseRef: React.RefObject<PhaseState>;
  mouthOpenRef: React.RefObject<boolean>;
  clouds: Cloud[];
}) {
  const { app } = useApplication();
  const gRef = useRef<any>(null);
  const timeRef = useRef(0);

  useTick(({ deltaTime }) => {
    const g = gRef.current;
    if (!g || !app) return;
    g.clear();

    const dt = deltaTime / 60;
    timeRef.current += dt;

    const w = app.screen.width;
    const h = app.screen.height;
    const cam = cameraRef.current!;
    const platformY = h * PLATFORM_Y_RATIO;

    // ── Sky gradient ──
    const skySteps = 8;
    for (let i = 0; i < skySteps; i++) {
      const t = i / skySteps;
      const r = ((SKY_TOP >> 16) & 0xFF) * (1 - t) + ((SKY_BOTTOM >> 16) & 0xFF) * t;
      const gr = ((SKY_TOP >> 8) & 0xFF) * (1 - t) + ((SKY_BOTTOM >> 8) & 0xFF) * t;
      const b = (SKY_TOP & 0xFF) * (1 - t) + (SKY_BOTTOM & 0xFF) * t;
      const color = (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
      g.rect(0, (platformY * i) / skySteps, w, platformY / skySteps + 1).fill({ color });
    }

    // ── Sun ──
    const sunX = w * 0.85;
    const sunY = h * 0.12;
    g.circle(sunX, sunY, 30).fill({ color: SUN_GLOW, alpha: 0.3 });
    g.circle(sunX, sunY, 22).fill({ color: SUN_GLOW, alpha: 0.5 });
    g.circle(sunX, sunY, 15).fill({ color: SUN_COLOR });

    // ── Clouds (parallax 0.15x) ──
    for (const c of clouds) {
      const cx = c.x - cam * 0.15 + timeRef.current * c.speed;
      const wrappedX = ((cx % (w + 200)) + (w + 200)) % (w + 200) - 100;
      drawCloud(g, wrappedX, c.y, c.scale);
    }

    // ── Abyss (below platforms) ──
    const abyssSteps = 4;
    const abyssH = h - platformY;
    for (let i = 0; i < abyssSteps; i++) {
      const t = i / abyssSteps;
      const r = ((ABYSS_TOP >> 16) & 0xFF) * (1 - t) + ((ABYSS_BOTTOM >> 16) & 0xFF) * t;
      const gr = ((ABYSS_TOP >> 8) & 0xFF) * (1 - t) + ((ABYSS_BOTTOM >> 8) & 0xFF) * t;
      const b = (ABYSS_TOP & 0xFF) * (1 - t) + (ABYSS_BOTTOM & 0xFF) * t;
      const color = (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
      g.rect(0, platformY + (abyssH * i) / abyssSteps, w, abyssH / abyssSteps + 1).fill({ color });
    }

    // ── Pillars ──
    const pillars = pillarsRef.current!;
    for (const p of pillars) {
      const px = p.x - cam;
      if (px + p.width < -10 || px > w + 10) continue;

      // Pillar body
      g.rect(px, platformY, p.width, PILLAR_HEIGHT).fill({ color: PILLAR_BODY });
      // Dark side (right edge shadow)
      g.rect(px + p.width - 4, platformY, 4, PILLAR_HEIGHT).fill({ color: PILLAR_DARK, alpha: 0.5 });
      // Brick lines
      for (let by = platformY + 12; by < platformY + PILLAR_HEIGHT; by += 16) {
        g.moveTo(px, by).lineTo(px + p.width, by).stroke({ width: 1, color: PILLAR_DARK, alpha: 0.3 });
        // Vertical brick offset
        const offset = ((by - platformY) / 16) % 2 === 0 ? p.width * 0.4 : p.width * 0.7;
        g.moveTo(px + offset, by).lineTo(px + offset, by + 16).stroke({ width: 1, color: PILLAR_DARK, alpha: 0.2 });
      }

      // Grass top
      g.roundRect(px - 3, platformY - 6, p.width + 6, 10, 4).fill({ color: PILLAR_TOP });
      g.roundRect(px - 1, platformY - 4, p.width + 2, 6, 3).fill({ color: PILLAR_GRASS });

      // Perfect zone indicator (golden stripe on grass)
      const pzW = p.width * PERFECT_ZONE_RATIO;
      const pzX = px + (p.width - pzW) / 2;
      const shimmer = 0.7 + Math.sin(timeRef.current * 4) * 0.3;
      g.rect(pzX, platformY - 5, pzW, 3).fill({ color: PERFECT_GOLD, alpha: shimmer });
    }

    // ── Stick ──
    const stick = stickRef.current!;
    if (stick.length > 0) {
      const sx = stick.x - cam;
      const sy = platformY;
      const angleRad = (stick.angle * Math.PI) / 180;

      const endX = sx + Math.sin(angleRad) * stick.length;
      const endY = sy - Math.cos(angleRad) * stick.length;

      // Wood stick with grain
      g.moveTo(sx, sy).lineTo(endX, endY).stroke({ width: STICK_WIDTH, color: STICK_COLOR });
      // Wood grain lines
      const grainCount = Math.floor(stick.length / 20);
      for (let i = 1; i <= grainCount; i++) {
        const t = i / (grainCount + 1);
        const gx = sx + Math.sin(angleRad) * stick.length * t;
        const gy = sy - Math.cos(angleRad) * stick.length * t;
        const perpX = Math.cos(angleRad) * 2;
        const perpY = Math.sin(angleRad) * 2;
        g.moveTo(gx - perpX, gy - perpY).lineTo(gx + perpX, gy + perpY)
          .stroke({ width: 1, color: STICK_STRIPE, alpha: 0.5 });
      }
    }

    // ── Character ──
    const char = charRef.current!;
    const cx = char.x - cam;
    const cy = char.y;
    drawCharacter(g, cx, cy, char.walking);

    // ── Mouth open indicator ──
    if (phaseRef.current === 'waiting' || phaseRef.current === 'growing') {
      const isOpen = mouthOpenRef.current!;
      const indicatorX = w / 2;
      const indicatorY = 36;

      // Cute face icon
      g.circle(indicatorX, indicatorY, 18).fill({ color: 0xFFDBB5 });
      g.circle(indicatorX, indicatorY, 18).stroke({ width: 2, color: isOpen ? 0xFF6B6B : 0xCCCCCC });
      // Eyes
      g.circle(indicatorX - 5, indicatorY - 3, 2).fill({ color: 0x333333 });
      g.circle(indicatorX + 5, indicatorY - 3, 2).fill({ color: 0x333333 });
      // Mouth
      if (isOpen) {
        g.ellipse(indicatorX, indicatorY + 5, 5, 6).fill({ color: 0x333333 });
        g.ellipse(indicatorX, indicatorY + 4, 5, 3).fill({ color: 0xFF6B6B });
      } else {
        g.moveTo(indicatorX - 4, indicatorY + 4).lineTo(indicatorX + 4, indicatorY + 4)
          .stroke({ width: 1.5, color: 0x333333 });
      }
    }
  });

  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

// ── Game Scene ──

function GameScene({
  videoRef,
  onTrackingStatus,
  touchActiveRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTrackingStatus: (s: { detectorReady: boolean; hasFace: boolean; error: string | null }) => void;
  touchActiveRef: React.MutableRefObject<boolean>;
}) {
  const { app } = useApplication();
  const gameState = useGameStore((s) => s.state);
  const addScore = useGameStore((s) => s.addScore);
  const addPerfect = useGameStore((s) => s.addPerfect);
  const setState = useGameStore((s) => s.setState);

  const { mouthOpenness, detectorReady, error } = useFaceTracking(videoRef, true);

  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);
  const clouds = useMemo(() => generateClouds(8), []);

  // Mouth state with hysteresis
  const mouthOpenRef = useRef(false);
  if (mouthOpenness !== null) {
    if (mouthOpenRef.current && mouthOpenness < MOUTH_CLOSE_THRESHOLD) {
      mouthOpenRef.current = false;
    } else if (!mouthOpenRef.current && mouthOpenness > MOUTH_OPEN_THRESHOLD) {
      mouthOpenRef.current = true;
    }
  }

  // Report tracking status
  useEffect(() => {
    onTrackingStatus({ detectorReady, hasFace: mouthOpenness !== null, error });
  }, [detectorReady, mouthOpenness !== null, error, onTrackingStatus]);

  // Game state refs
  const pillarsRef = useRef<Pillar[]>([]);
  const stickRef = useRef({ x: 0, length: 0, angle: 0 });
  const charRef = useRef({ x: 0, y: 0, walking: false });
  const cameraRef = useRef(0);
  const targetCameraRef = useRef(0);
  const phaseRef = useRef<PhaseState>('waiting');
  const currentPillarIdx = useRef(0);
  const prevMouthOpen = useRef(false);

  // Init pillars on game start
  useEffect(() => {
    if (gameState === 'playing') {
      const screenH = app?.screen.height ?? 600;
      const platformY = screenH * PLATFORM_Y_RATIO;

      // Generate initial pillars (enough to fill screen)
      const initPillars: Pillar[] = [{ x: 40, width: FIRST_PILLAR_WIDTH }];
      for (let i = 0; i < 5; i++) {
        const prev = initPillars[initPillars.length - 1];
        const gap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
        const pw = PILLAR_MIN_WIDTH + Math.random() * (PILLAR_MAX_WIDTH - PILLAR_MIN_WIDTH);
        initPillars.push({ x: prev.x + prev.width + gap, width: pw });
      }

      pillarsRef.current = initPillars;
      currentPillarIdx.current = 0;

      const charX = initPillars[0].x + initPillars[0].width / 2;
      charRef.current = { x: charX, y: platformY, walking: false };
      stickRef.current = { x: initPillars[0].x + initPillars[0].width, length: 0, angle: 0 };
      cameraRef.current = 0;
      targetCameraRef.current = 0;
      phaseRef.current = 'waiting';
      prevMouthOpen.current = false;
    }
  }, [gameState, app]);

  // Game tick
  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;
    floatingTexts.update(dt);

    if (gameState !== 'playing') return;

    const screenW = app?.screen.width ?? 800;
    const screenH = app?.screen.height ?? 600;
    const platformY = screenH * PLATFORM_Y_RATIO;

    const phase = phaseRef.current;
    const stick = stickRef.current;
    const char = charRef.current;
    const pillars = pillarsRef.current;
    const curIdx = currentPillarIdx.current;
    const curPillar = pillars[curIdx];
    const nextPillar = pillars[curIdx + 1];

    // Combine mouth detection and touch fallback
    const isOpen = mouthOpenRef.current || touchActiveRef.current;
    const wasOpen = prevMouthOpen.current;
    const justOpened = isOpen && !wasOpen;
    const justClosed = !isOpen && wasOpen;
    prevMouthOpen.current = isOpen;

    if (phase === 'waiting') {
      char.walking = false;
      if (justOpened) {
        phaseRef.current = 'growing';
        stick.x = curPillar.x + curPillar.width;
        stick.length = 0;
        stick.angle = 0;
      }
    } else if (phase === 'growing') {
      stick.length += STICK_GROW_SPEED * dt;
      if (justClosed) {
        phaseRef.current = 'falling';
      }
    } else if (phase === 'falling') {
      stick.angle += 300 * dt;
      if (stick.angle >= 90) {
        stick.angle = 90;
        const stickEndX = stick.x + stick.length;

        if (nextPillar && stickEndX >= nextPillar.x && stickEndX <= nextPillar.x + nextPillar.width) {
          const pillarCenter = nextPillar.x + nextPillar.width / 2;
          const perfectHalfW = (nextPillar.width * PERFECT_ZONE_RATIO) / 2;
          const isPerfect = Math.abs(stickEndX - pillarCenter) <= perfectHalfW;

          if (isPerfect) {
            addScore(2);
            addPerfect();
            SFX.combo();
            floatingTexts.add('PERFECT!', screenW / 2, screenH / 3, '#FFD700');
          } else {
            addScore(1);
            SFX.pop();
          }
          phaseRef.current = 'walking';
          char.walking = true;
        } else {
          phaseRef.current = 'walking';
          char.walking = true;
        }
      }
    } else if (phase === 'walking') {
      const stickEndX = stick.x + stick.length;
      const landed = nextPillar && stickEndX >= nextPillar.x && stickEndX <= nextPillar.x + nextPillar.width;

      if (landed) {
        const targetX = nextPillar.x + nextPillar.width / 2;
        if (char.x < targetX) {
          char.x += CHAR_SPEED * dt;
          if (char.x >= targetX) {
            char.x = targetX;
            char.walking = false;
            currentPillarIdx.current = curIdx + 1;

            // Generate next pillar ahead
            const lastPillar = pillars[pillars.length - 1];
            const gap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
            const nextW = PILLAR_MIN_WIDTH + Math.random() * (PILLAR_MAX_WIDTH - PILLAR_MIN_WIDTH);
            pillars.push({ x: lastPillar.x + lastPillar.width + gap, width: nextW });

            stickRef.current = { x: nextPillar.x + nextPillar.width, length: 0, angle: 0 };

            // Start smooth camera transition
            targetCameraRef.current = nextPillar.x - screenW * 0.2;
            phaseRef.current = 'transitioning';
          }
        }
      } else {
        const walkTarget = stickEndX;
        if (char.x < walkTarget) {
          char.x += CHAR_SPEED * dt;
          if (char.x >= walkTarget) char.x = walkTarget;
        } else {
          phaseRef.current = 'dying';
        }
      }
    } else if (phase === 'transitioning') {
      // Smooth camera pan to target
      const target = targetCameraRef.current;
      const diff = target - cameraRef.current;
      if (Math.abs(diff) < 1) {
        cameraRef.current = target;
        phaseRef.current = 'waiting';
      } else {
        // Ease-out lerp
        cameraRef.current += diff * Math.min(1, 5 * dt);
      }
    } else if (phase === 'dying') {
      char.y += CHAR_FALL_SPEED * dt;
      char.walking = false;
      if (char.y > screenH + 50) {
        SFX.bomb();
        setState('result');
      }
    }
  });

  return (
    <GameRenderer
      pillarsRef={pillarsRef}
      stickRef={stickRef}
      charRef={charRef}
      cameraRef={cameraRef}
      phaseRef={phaseRef}
      mouthOpenRef={mouthOpenRef}
      clouds={clouds}
    />
  );
}

// ── Floating text overlay ──

function FloatingTextOverlay({ texts }: { texts: FloatingTextSystem }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 16);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
      {texts.items.map((item, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            transform: `translate(-50%, -50%) scale(${item.scale})`,
            color: item.color,
            fontSize: 24,
            fontWeight: 900,
            opacity: item.alpha,
            textShadow: '0 2px 6px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}

// ── Main App ──

export function App() {
  const gameState = useGameStore((s) => s.state);
  const setState = useGameStore((s) => s.setState);
  const resetGame = useGameStore((s) => s.resetGame);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchActiveRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState({
    detectorReady: false, hasFace: false, error: null as string | null,
  });
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth,
  );

  useEffect(() => {
    function check() { setIsPortrait(window.innerHeight > window.innerWidth); }
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  // Init camera (video only, no mic needed)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setCameraReady(true);
        }
      } catch {
        if (!cancelled) setCameraError('需要摄像头才能游戏，请授权后刷新页面。');
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const handleTrackingStatus = useCallback((s: { detectorReady: boolean; hasFace: boolean; error: string | null }) => {
    setTrackingStatus(s);
  }, []);

  const handleStart = useCallback(() => {
    unlockAudio();
    SFX.start();
    document.documentElement.requestFullscreen?.().catch(() => {});
    setState('countdown');
  }, [setState]);

  const handleCountdownComplete = useCallback(() => {
    setState('playing');
  }, [setState]);

  const handleRestart = useCallback(() => {
    resetGame();
    setState('countdown');
  }, [resetGame, setState]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Application
        resizeTo={typeof window !== 'undefined' ? window : undefined}
        background={SKY_TOP}
        antialias
      >
        <GameScene
          videoRef={videoRef}
          onTrackingStatus={handleTrackingStatus}
          touchActiveRef={touchActiveRef}
        />
      </Application>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          ...(isPortrait
            ? { top: 12, right: 12 }
            : { bottom: 12, right: 12 }),
          width: 100, height: 75, borderRadius: 10,
          objectFit: 'cover', transform: 'scaleX(-1)',
          opacity: 0.5, border: '2px solid rgba(255,255,255,0.3)',
          zIndex: 100, pointerEvents: 'none',
        }}
      />

      {gameState === 'idle' && (
        <StartScreen
          loading={!cameraReady || !trackingStatus.detectorReady}
          error={cameraError || trackingStatus.error}
          onStart={handleStart}
        />
      )}
      {gameState === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}
      {gameState === 'playing' && (
        <div
          onPointerDown={() => { touchActiveRef.current = true; }}
          onPointerUp={() => { touchActiveRef.current = false; }}
          onPointerLeave={() => { touchActiveRef.current = false; }}
          onPointerCancel={() => { touchActiveRef.current = false; }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10,
            touchAction: 'none',
          }}
        />
      )}
      {gameState === 'playing' && <HUD />}
      {gameState === 'result' && <ResultScreen onRestart={handleRestart} />}
    </div>
  );
}
