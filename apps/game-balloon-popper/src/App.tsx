import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import { useHandTracking, usePinchDetector, SFX, unlockAudio, type PinchEvent } from '@motion-games/engine';
import { StartScreen } from './components/StartScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { HUD } from './components/HUD';
import { ResultScreen } from './components/ResultScreen';
import { useGameStore } from './store/useGameStore';
import {
  type BalloonState, spawnBalloon, updateBalloon, isBalloonOffScreen,
} from './game/Balloon';
import { findHitBalloon } from './game/collision';
import {
  GAME_DURATION, SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX, MAX_BALLOONS,
  SCORE_POP, SCORE_BOMB, COMBO_THRESHOLD, COMBO_BONUS,
} from './game/constants';
import { PopParticleSystem } from './effects/PopParticles';
import { FloatingTextSystem } from './effects/FloatingText';
import { ScreenShake } from './effects/ScreenShake';

extend({ Container, Graphics });

// ── Background with gradient sky ──
function Background() {
  const { app } = useApplication();
  const draw = useCallback((g: any) => {
    g.clear();
    const w = app?.screen.width ?? 800;
    const h = app?.screen.height ?? 600;
    // Sky gradient (top to bottom)
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(0x87 + (0xE0 - 0x87) * t);
      const gv = Math.round(0xCE + (0xF0 - 0xCE) * t);
      const b = Math.round(0xEB + (0xFF - 0xEB) * t);
      const color = (r << 16) | (gv << 8) | b;
      g.rect(0, (h * i) / steps, w, h / steps + 1).fill({ color });
    }
    // Simple grass at bottom
    g.rect(0, h - 40, w, 40).fill({ color: 0x7CB342 });
    g.rect(0, h - 42, w, 4).fill({ color: 0x8BC34A });
    // Clouds
    drawCloud(g, w * 0.15, h * 0.12, 0.8);
    drawCloud(g, w * 0.55, h * 0.08, 1.0);
    drawCloud(g, w * 0.85, h * 0.18, 0.6);
  }, [app]);

  return <pixiGraphics draw={draw} />;
}

function drawCloud(g: any, cx: number, cy: number, scale: number) {
  const s = scale;
  const color = 0xFFFFFF;
  const alpha = 0.7;
  g.circle(cx, cy, 25 * s).fill({ color, alpha });
  g.circle(cx - 20 * s, cy + 5 * s, 20 * s).fill({ color, alpha });
  g.circle(cx + 20 * s, cy + 5 * s, 22 * s).fill({ color, alpha });
  g.circle(cx + 10 * s, cy - 8 * s, 18 * s).fill({ color, alpha });
}

// ── Effects renderer ──
function EffectsRenderer({
  particles,
  floatingTexts,
}: {
  particles: PopParticleSystem;
  floatingTexts: FloatingTextSystem;
}) {
  const draw = useCallback((g: any) => {
    g.clear();
    particles.draw(g);
  }, [particles]);

  return (
    <>
      <pixiGraphics draw={draw} />
      {/* Floating texts rendered as HTML overlay for simplicity */}
    </>
  );
}

// ── Balloon renderer using Graphics ──
function BalloonRenderer({ balloons }: { balloons: React.RefObject<BalloonState[]> }) {
  const draw = useCallback((g: any) => {
    g.clear();
    for (const b of balloons.current!) {
      if (!b.alive) continue;
      const r = b.radius * b.scale;

      if (b.type === 'bomb') {
        g.circle(b.x, b.y, r).fill({ color: 0x333333, alpha: 0.9 });
        g.circle(b.x, b.y, r).stroke({ color: 0xFF4444, width: 3 });
        // Skull-like X
        const s = r * 0.4;
        g.moveTo(b.x - s, b.y - s).lineTo(b.x + s, b.y + s).stroke({ color: 0xFF4444, width: 2.5 });
        g.moveTo(b.x + s, b.y - s).lineTo(b.x - s, b.y + s).stroke({ color: 0xFF4444, width: 2.5 });
        // Fuse
        g.moveTo(b.x, b.y - r).lineTo(b.x + 8, b.y - r - 15).stroke({ color: 0xFF8800, width: 2 });
        // Spark
        g.circle(b.x + 8, b.y - r - 15, 3).fill({ color: 0xFFFF00, alpha: 0.8 + Math.sin(b.breathPhase * 5) * 0.2 });
      } else {
        // Main balloon body
        g.circle(b.x, b.y, r).fill({ color: b.color, alpha: 0.85 });
        // Highlight (gives 3D feel)
        g.circle(b.x - r * 0.25, b.y - r * 0.3, r * 0.25).fill({ color: 0xFFFFFF, alpha: 0.4 });
        g.circle(b.x - r * 0.15, b.y - r * 0.15, r * 0.1).fill({ color: 0xFFFFFF, alpha: 0.6 });
        // Knot
        g.circle(b.x, b.y + r, 3).fill({ color: b.color, alpha: 0.7 });
        // String with curve
        g.moveTo(b.x, b.y + r + 3)
          .quadraticCurveTo(b.x + 6, b.y + r + 22, b.x - 4, b.y + r + 40)
          .stroke({ color: 0x999999, width: 1.5, alpha: 0.5 });
      }
    }
  }, [balloons]);

  return <pixiGraphics draw={draw} />;
}

// ── Cursor renderer ──
function CursorRenderer({ pos, isPinching }: { pos: React.RefObject<{ x: number; y: number }>; isPinching: boolean }) {
  const draw = useCallback((g: any) => {
    g.clear();
    const { x, y } = pos.current!;
    if (isPinching) {
      // Pinch: tight bright dot
      g.circle(x, y, 6).fill({ color: 0xFFD54F, alpha: 0.9 });
      g.circle(x, y, 14).stroke({ color: 0xFFD54F, width: 2.5, alpha: 0.7 });
      // Ripple
      g.circle(x, y, 24).stroke({ color: 0xFFD54F, width: 1, alpha: 0.3 });
    } else {
      // Open: relaxed ring with crosshair
      g.circle(x, y, 22).stroke({ color: 0xFFFFFF, width: 2, alpha: 0.5 });
      g.circle(x, y, 3).fill({ color: 0xFFFFFF, alpha: 0.4 });
      // Dashed effect (4 arcs)
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i;
        g.arc(x, y, 28, angle, angle + 0.8).stroke({ color: 0xFFFFFF, width: 1.5, alpha: 0.3 });
      }
    }
  }, [pos, isPinching]);

  return <pixiGraphics draw={draw} />;
}

// ── Game scene (runs inside PixiJS Application) ──
function GameScene({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const { app } = useApplication();
  const balloonsRef = useRef<BalloonState[]>([]);
  const spawnTimerRef = useRef(0);
  const gameTimeRef = useRef(0);
  const cursorPos = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => new PopParticleSystem(), []);
  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);
  const screenShake = useMemo(() => new ScreenShake(), []);

  const gameState = useGameStore((s) => s.state);
  const addScore = useGameStore((s) => s.addScore);
  const incrementCombo = useGameStore((s) => s.incrementCombo);
  const resetCombo = useGameStore((s) => s.resetCombo);
  const addMiss = useGameStore((s) => s.addMiss);
  const setTimeLeft = useGameStore((s) => s.setTimeLeft);
  const setState = useGameStore((s) => s.setState);

  const { hand } = useHandTracking(videoRef, gameState !== 'idle');

  const onPinchStart = useCallback((e: PinchEvent) => {
    if (useGameStore.getState().state !== 'playing') return;
    const w = app?.screen.width ?? 800;
    const h = app?.screen.height ?? 600;
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    const px = (e.point.x / vw) * w;
    const py = (e.point.y / vh) * h;

    const hit = findHitBalloon(px, py, balloonsRef.current);
    if (hit) {
      hit.alive = false;
      if (hit.type === 'normal') {
        const combo = useGameStore.getState().combo;
        const bonus = combo >= COMBO_THRESHOLD ? COMBO_BONUS : 0;
        const score = SCORE_POP + bonus;
        addScore(score);
        incrementCombo();
        particles.emit(hit.x, hit.y, hit.color, 10);
        SFX.pop();
        const comboNow = combo + 1;
        if (comboNow >= COMBO_THRESHOLD) {
          floatingTexts.add(`x${comboNow} +${score}`, hit.x, hit.y - 30, '#FFD54F');
          SFX.combo();
        } else {
          floatingTexts.add(`+${score}`, hit.x, hit.y - 20);
        }
      } else {
        addScore(SCORE_BOMB);
        resetCombo();
        particles.emit(hit.x, hit.y, 0xFF4444, 15);
        screenShake.trigger(12, 0.2);
        floatingTexts.add(`${SCORE_BOMB}`, hit.x, hit.y - 20, '#FF4444');
        SFX.bomb();
      }
    }
  }, [app, videoRef, addScore, incrementCombo, resetCombo, particles, floatingTexts, screenShake]);

  const pinchState = usePinchDetector(
    hand,
    videoRef.current?.videoWidth || 640,
    onPinchStart,
  );

  // Update cursor position
  if (hand && app) {
    const w = app.screen.width;
    const h = app.screen.height;
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    cursorPos.current = {
      x: (hand.indexTip.x / vw) * w,
      y: (hand.indexTip.y / vh) * h,
    };
  }

  // Game tick
  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;

    // Always update effects
    particles.update(dt);
    floatingTexts.update(dt);
    screenShake.update(dt);

    // Apply screen shake to stage
    if (app?.stage) {
      app.stage.position.set(screenShake.offsetX, screenShake.offsetY);
    }

    if (gameState !== 'playing') return;

    const balloons = balloonsRef.current;
    const screenW = app?.screen.width ?? 800;
    const screenH = app?.screen.height ?? 600;

    gameTimeRef.current += dt;
    const remaining = Math.max(0, GAME_DURATION - gameTimeRef.current);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      setState('result');
      return;
    }

    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0 && balloons.filter((b) => b.alive).length < MAX_BALLOONS) {
      balloons.push(spawnBalloon(screenW, screenH));
      spawnTimerRef.current = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    }

    for (const b of balloons) {
      if (!b.alive) continue;
      updateBalloon(b, dt);
      if (isBalloonOffScreen(b)) {
        b.alive = false;
        if (b.type === 'normal') {
          addMiss();
          resetCombo();
        }
      }
    }

    if (balloons.length > MAX_BALLOONS * 2) {
      balloonsRef.current = balloons.filter((b) => b.alive);
    }
  });

  useEffect(() => {
    if (gameState === 'playing') {
      balloonsRef.current = [];
      spawnTimerRef.current = 0.5;
      gameTimeRef.current = 0;
    }
  }, [gameState]);

  const showCursor = hand && (gameState === 'playing' || gameState === 'countdown');

  return (
    <>
      <Background />
      <BalloonRenderer balloons={balloonsRef} />
      <EffectsRenderer particles={particles} floatingTexts={floatingTexts} />
      {showCursor && (
        <CursorRenderer pos={cursorPos} isPinching={pinchState.isPinching} />
      )}
    </>
  );
}

// ── Floating text HTML overlay ──
function FloatingTextOverlay({ texts }: { texts: FloatingTextSystem }) {
  // Force re-render every frame via a tick counter
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
            transition: 'none',
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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);

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

  const handleStart = useCallback(() => {
    unlockAudio();
    SFX.start();
    setState('countdown');
  }, [setState]);

  const handleCountdownComplete = useCallback(() => {
    setState('playing');
    useGameStore.getState().setTimeLeft(GAME_DURATION);
  }, [setState]);

  const handleRestart = useCallback(() => {
    resetGame();
    setState('countdown');
  }, [resetGame, setState]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Application
        resizeTo={typeof window !== 'undefined' ? window : undefined}
        background="#87CEEB"
        antialias
      >
        <GameScene videoRef={videoRef} />
      </Application>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed', bottom: 12, right: 12,
          width: 160, height: 120, borderRadius: 12,
          objectFit: 'cover', transform: 'scaleX(-1)',
          opacity: 0.6, border: '2px solid rgba(255,255,255,0.3)',
          zIndex: 100, pointerEvents: 'none',
        }}
      />

      {gameState === 'idle' && (
        <StartScreen loading={!cameraReady} error={cameraError} onStart={handleStart} />
      )}
      {gameState === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}
      {gameState === 'playing' && <HUD />}
      {gameState === 'result' && <ResultScreen onRestart={handleRestart} />}
    </div>
  );
}
