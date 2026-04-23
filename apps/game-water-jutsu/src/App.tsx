// App: 3-layer canvas architecture for Water Jutsu Striker.
//
//   Layer 0: <video> — camera feed (CSS mirror + dark filter)
//   Layer 1: <canvas> — Three.js GPU fluid simulation (mix-blend-mode: screen)
//   Layer 2: PixiJS Application — fire targets, steam particles, floating text
//   Layer 3: React DOM — HUD, StartScreen, CountdownOverlay, ResultScreen
//
// Game loop runs in PixiJS useTick. Each tick:
//   1. Advance fluid sim + render to fluid canvas
//   2. Map hand landmarks to fluid splats via HandToFluid
//   3. Check collisions (palm vs targets)
//   4. Update spawner + effects
//   5. Update game timer

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import {
  useHandTracking, useFluidSim, useWakeLock,
  common, getLocale,
} from '@motion-games/engine';
import { useGameStore } from './store/useGameStore';
import { StartScreen } from './components/StartScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { HUD } from './components/HUD';
import { ResultScreen } from './components/ResultScreen';
import { TargetSpawner } from './game/TargetSpawner';
import { HandToFluid } from './game/HandToFluid';
import { checkCollisions } from './game/collision';
import { SteamParticles } from './effects/SteamParticles';
import { FloatingText } from './effects/FloatingText';
import { ScreenShake } from './effects/ScreenShake';
import {
  GAME_DURATION, SCORE_SEAL, SCORE_NINJA, WATER_COLOR_STEAM,
  FLUID_RADIUS_OPEN,
} from './game/constants';

extend({ Container, Graphics });

// ── GPU tier detection ──────────────────────────────────────────────────────
function detectGpuTier(): 'high' | 'mid' | 'low' {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'low';
  const renderer = (gl as WebGLRenderingContext)
    .getExtension('WEBGL_debug_renderer_info');
  if (!renderer) return 'mid';
  const info = (gl as WebGLRenderingContext)
    .getParameter(renderer.UNMASKED_RENDERER_WEBGL) as string;
  if (/apple/i.test(info)) return 'high'; // Apple GPU – very capable
  if (/nvidia|radeon|geforce/i.test(info)) return 'high';
  if (/intel iris|iris xe/i.test(info)) return 'mid';
  return 'mid';
}

const GPU_TIER = detectGpuTier();
const FLUID_CONFIG = {
  high: { simRes: 128, dyeRes: 1024, pressureIter: 20 },
  mid:  { simRes: 128, dyeRes: 512,  pressureIter: 15 },
  low:  { simRes: 64,  dyeRes: 256,  pressureIter: 10 },
}[GPU_TIER];

// ── PixiJS Game Scene ───────────────────────────────────────────────────────
interface SceneProps {
  fluidStep:   (dt: number) => void;
  fluidRender: () => void;
  fluidSplat:  (x: number, y: number, dx: number, dy: number, c: [number, number, number], r?: number) => void;
  videoRef:    React.RefObject<HTMLVideoElement | null>;
  screenW:     number;
  screenH:     number;
}

function GameScene({ fluidStep, fluidRender, fluidSplat, videoRef, screenW, screenH }: SceneProps) {
  const { app } = useApplication();

  // --- game store ---
  const gameState      = useGameStore((s) => s.state);
  const addScore       = useGameStore((s) => s.addScore);
  const incrementCombo = useGameStore((s) => s.incrementCombo);
  const resetCombo     = useGameStore((s) => s.resetCombo);
  const addMiss        = useGameStore((s) => s.addMiss);
  const setTimeLeft    = useGameStore((s) => s.setTimeLeft);
  const setState       = useGameStore((s) => s.setState);

  // --- effects systems (stable across re-renders) ---
  const spawnerContainerRef = useRef<any>(null);
  const fxContainerRef      = useRef<any>(null);

  const spawnerRef = useRef<TargetSpawner | null>(null);
  const steamRef   = useRef<SteamParticles | null>(null);
  const floatRef   = useRef<FloatingText | null>(null);
  const shakeRef   = useRef<ScreenShake | null>(null);
  const handFluider = useMemo(() => new HandToFluid(), []);

  // --- hand tracking ---
  const { hand } = useHandTracking(videoRef, true);
  const handRef  = useRef(hand);
  handRef.current = hand;

  // --- velocity tracking for collision threshold ---
  const prevPalmRef    = useRef<{ x: number; y: number } | null>(null);
  const handSpeedRef   = useRef(0);
  const gameTimeRef    = useRef(0);

  // Initialize spawner and effects when containers mount
  useEffect(() => {
    const sc = spawnerContainerRef.current;
    const fx = fxContainerRef.current;
    if (!sc || !fx) return;

    spawnerRef.current = new TargetSpawner(sc, screenW, screenH);
    spawnerRef.current.onEscape = (t) => {
      if (t.kind === 'seal') {
        addMiss();
        resetCombo();
      }
    };

    steamRef.current = new SteamParticles(fx);
    floatRef.current = new FloatingText(fx);
    shakeRef.current = new ScreenShake();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset game state when transitioning to 'playing'
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimeRef.current = 0;
      prevPalmRef.current = null;
      handSpeedRef.current = 0;
      spawnerRef.current?.clear();
      spawnerRef.current?.resize(screenW, screenH);
      steamRef.current?.clear();
      floatRef.current?.clear();
      handFluider.reset();
    }
  }, [gameState, screenW, screenH, handFluider]);

  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;

    // ── Fluid sim step + render ──────────────────────────────────────────
    fluidStep(dt);
    fluidRender();

    // ── Hand → fluid splats ──────────────────────────────────────────────
    const h = handRef.current;
    const vw = videoRef.current?.videoWidth  || 640;
    const vh = videoRef.current?.videoHeight || 480;

    if (h && h.landmarks.length >= 21) {
      // Map landmarks from video pixel space to screen pixel space
      const screenLm = h.landmarks.map((lm) => ({
        x: (lm.x / vw) * screenW,
        y: (lm.y / vh) * screenH,
      }));

      // Inject splats into fluid sim
      handFluider.update(
        screenLm,
        false, // isPinch — always open for water-flow feel (pinch detection via usePinchDetector elsewhere)
        fluidSplat,
        screenW,
        screenH,
      );

      // Estimate hand speed for collision gate
      const palmX = (screenLm[0].x + screenLm[9].x) / 2;
      const palmY = (screenLm[0].y + screenLm[9].y) / 2;
      if (prevPalmRef.current) {
        const dx = palmX - prevPalmRef.current.x;
        const dy = palmY - prevPalmRef.current.y;
        // Speed in px/s; divide by dt (but cap to avoid spike on first frame)
        handSpeedRef.current = Math.min(Math.hypot(dx, dy) / Math.max(dt, 0.004), 5000);
      }
      prevPalmRef.current = { x: palmX, y: palmY };

      // ── Collision detection ─────────────────────────────────────────────
      if (gameState === 'playing' && spawnerRef.current) {
        const hits = checkCollisions(screenLm, handSpeedRef.current, spawnerRef.current.targets);
        for (const t of hits) {
          t.markHit();

          const isNinja = t.kind === 'ninja';
          const pts     = isNinja ? SCORE_NINJA : SCORE_SEAL;
          addScore(pts);
          incrementCombo();

          // Steam burst at target
          steamRef.current?.burst(t.x, t.y, isNinja ? 28 : 16, isNinja ? 1.5 : 1);

          // Floating score text
          const comboNow = useGameStore.getState().combo;
          const label    = comboNow >= 3 ? `+${pts} ${comboNow}× COMBO!` : `+${pts}`;
          const color    = isNinja ? '#FFDD00' : '#00EEFF';
          floatRef.current?.spawn(label, t.x, t.y - 20, color);

          // Big steam splat into fluid
          fluidSplat(
            t.x / screenW, t.y / screenH,
            0, 0,
            WATER_COLOR_STEAM,
            FLUID_RADIUS_OPEN * (isNinja ? 2.0 : 1.4),
          );

          if (isNinja) {
            shakeRef.current?.trigger();
          }
        }
      }
    } else {
      // No hand detected — decay speed smoothly
      handSpeedRef.current = handSpeedRef.current * 0.85;
    }

    // ── Game timer ───────────────────────────────────────────────────────
    if (gameState === 'playing') {
      gameTimeRef.current += dt;
      const remaining = Math.max(0, GAME_DURATION - gameTimeRef.current);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        spawnerRef.current?.clear();
        setState('result');
        return;
      }

      spawnerRef.current?.update(dt);
    }

    // ── Effects update ───────────────────────────────────────────────────
    steamRef.current?.update(dt);
    floatRef.current?.update(dt);
    const shake = shakeRef.current;
    if (shake) {
      shake.update(dt);
      if (app?.stage) {
        app.stage.position.set(shake.offsetX, shake.offsetY);
      }
    }
  });

  return (
    <>
      {/* Game objects layer */}
      <pixiContainer ref={spawnerContainerRef} />
      {/* Effects layer (steam, floating text) */}
      <pixiContainer ref={fxContainerRef} />
    </>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export function App() {
  const gameState  = useGameStore((s) => s.state);
  const setState   = useGameStore((s) => s.setState);
  const resetGame  = useGameStore((s) => s.resetGame);

  useWakeLock(gameState !== 'idle');

  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function onResize() {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Camera setup
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setCameraReady(true);
        }
      } catch {
        if (!cancelled) setCameraError(common.cameraError[getLocale()]);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Fluid simulation hook
  const { canvasRef: fluidCanvasRef, splat: fluidSplat, step: fluidStep, render: fluidRender } =
    useFluidSim(FLUID_CONFIG);

  // Handlers
  const handleStart = useCallback(() => {
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
    <div style={styles.root}>
      {/* Layer 0: Camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={styles.video}
      />

      {/* Layer 1: Three.js fluid canvas (screen blend) */}
      <canvas
        ref={fluidCanvasRef}
        width={screenSize.width}
        height={screenSize.height}
        style={styles.fluidCanvas}
      />

      {/* Layer 2: PixiJS game canvas (transparent, game objects) */}
      {cameraReady && (
        <div style={styles.pixiCanvas}>
          <Application
            backgroundAlpha={0}
            resizeTo={window}
            antialias={false}
          >
            <GameScene
              fluidStep={fluidStep}
              fluidRender={fluidRender}
              fluidSplat={fluidSplat}
              videoRef={videoRef}
              screenW={screenSize.width}
              screenH={screenSize.height}
            />
          </Application>
        </div>
      )}

      {/* Layer 3: React HUD + overlays */}
      {cameraError && (
        <div style={styles.errorMsg}>{cameraError}</div>
      )}

      {!cameraError && !cameraReady && (
        <div style={styles.loadingMsg}>
          {navigator.language.startsWith('zh') ? '启动摄像头中…' : 'Starting camera…'}
        </div>
      )}

      {gameState === 'idle' && cameraReady && (
        <StartScreen onStart={handleStart} />
      )}

      {gameState === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}

      {gameState === 'playing' && <HUD />}

      {gameState === 'result' && (
        <ResultScreen onRestart={handleRestart} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:   'relative',
    width:      '100%',
    height:     '100dvh',
    overflow:   'hidden',
    background: '#000',
  },
  video: {
    position:   'absolute',
    inset:      0,
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
    // Mirror the camera so it acts as a natural mirror
    transform:  'scaleX(-1)',
    filter:     'brightness(0.55) saturate(0.75)',
    zIndex:     0,
  },
  fluidCanvas: {
    position:      'absolute',
    inset:         0,
    width:         '100%',
    height:        '100%',
    // Screen blend makes bright water glow on the dark camera feed
    mixBlendMode:  'screen',
    pointerEvents: 'none',
    zIndex:        1,
  },
  pixiCanvas: {
    position:   'absolute',
    inset:      0,
    zIndex:     2,
  },
  errorMsg: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    color:          '#FF6666',
    fontSize:       18,
    zIndex:         50,
    padding:        20,
    textAlign:      'center',
  },
  loadingMsg: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    color:          '#88CCEE',
    fontSize:       18,
    zIndex:         50,
  },
};
