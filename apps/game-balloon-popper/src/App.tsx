import { useCallback, useEffect, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import { useHandTracking, usePinchDetector, type PinchEvent } from '@motion-games/engine';
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

extend({ Container, Graphics });

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
        g.moveTo(b.x, b.y - r).lineTo(b.x + 8, b.y - r - 15).stroke({ color: 0xFF8800, width: 2 });
      } else {
        g.circle(b.x, b.y, r).fill({ color: b.color, alpha: 0.85 });
        g.circle(b.x - r * 0.25, b.y - r * 0.3, r * 0.25).fill({ color: 0xFFFFFF, alpha: 0.4 });
        g.moveTo(b.x, b.y + r)
          .quadraticCurveTo(b.x + 5, b.y + r + 20, b.x - 3, b.y + r + 35)
          .stroke({ color: b.color, width: 1.5, alpha: 0.6 });
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
    const r = isPinching ? 14 : 22;
    const alpha = isPinching ? 0.9 : 0.5;
    const color = isPinching ? 0xFFD54F : 0xFFFFFF;
    g.circle(x, y, r).stroke({ color, width: isPinching ? 3 : 2, alpha });
    if (isPinching) {
      g.circle(x, y, 5).fill({ color: 0xFFD54F, alpha: 0.8 });
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

  const gameState = useGameStore((s) => s.state);
  const addScore = useGameStore((s) => s.addScore);
  const incrementCombo = useGameStore((s) => s.incrementCombo);
  const resetCombo = useGameStore((s) => s.resetCombo);
  const addMiss = useGameStore((s) => s.addMiss);
  const setTimeLeft = useGameStore((s) => s.setTimeLeft);
  const setState = useGameStore((s) => s.setState);

  // Hand tracking
  const { hand, detectorReady } = useHandTracking(videoRef, gameState !== 'idle');

  // Expose detectorReady to parent via store (hack but simple)
  useEffect(() => {
    (window as any).__detectorReady = detectorReady;
  }, [detectorReady]);

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
        addScore(SCORE_POP + bonus);
        incrementCombo();
      } else {
        addScore(SCORE_BOMB);
        resetCombo();
      }
    }
  }, [app, videoRef, addScore, incrementCombo, resetCombo]);

  const pinchState = usePinchDetector(
    hand,
    videoRef.current?.videoWidth || 640,
    onPinchStart,
  );

  // Update cursor position from hand
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
    if (gameState !== 'playing') return;
    const dt = deltaTime / 60;
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

  // Reset balloons when game starts
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
      <BalloonRenderer balloons={balloonsRef} />
      {showCursor && (
        <CursorRenderer pos={cursorPos} isPinching={pinchState.isPinching} />
      )}
    </>
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

  // Initialize camera
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

      {/* Camera video element */}
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

      {/* UI Overlays */}
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
