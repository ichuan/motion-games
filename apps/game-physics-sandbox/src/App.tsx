import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics } from 'pixi.js';
import { useCursor, CursorOverlay, SFX, unlockAudio, useT, getLocale, common, useWakeLock, type CursorState } from '@motion-games/engine';
import sandboxTexts from './i18n';
import { StartScreen } from './components/StartScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { HUD } from './components/HUD';
import { ResultScreen } from './components/ResultScreen';
import { useGameStore } from './store/useGameStore';
import { PhysicsWorld, type BodyInfo } from './game/PhysicsWorld';
import { type TowerBlock, buildTower, checkToppledBlocks, isTowerCleared } from './game/Tower';
import { type Throwable, spawnThrowable, findNearestThrowable } from './game/Throwable';
import {
  GAME_DURATION, PLATFORM_Y_RATIO, PLATFORM_THICKNESS,
  GRAB_RADIUS, THROW_SPEED_MULTIPLIER, VELOCITY_HISTORY_FRAMES,
  MAX_THROWABLES, SCORE_PER_BLOCK, FULL_CLEAR_BONUS,
  BLOCK_COLORS,
} from './game/constants';
import { ScreenShake } from './effects/ScreenShake';
import { FloatingTextSystem } from './effects/FloatingText';
import { CollisionParticleSystem } from './effects/CollisionParticles';

extend({ Container, Graphics });

const NOOP_DRAW = () => {};

// ── Background ──
function Background() {
  const { app } = useApplication();
  const draw = useCallback((g: any) => {
    g.clear();
    const w = app?.screen.width ?? 800;
    const h = app?.screen.height ?? 600;

    // Warm gradient background
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(0xE8 + (0xF5 - 0xE8) * t);
      const gv = Math.round(0xEA + (0xF5 - 0xEA) * t);
      const b = Math.round(0xF6 + (0xF5 - 0xF6) * t);
      const color = (r << 16) | (gv << 8) | b;
      g.rect(0, (h * i) / steps, w, h / steps + 1).fill({ color });
    }

    // Ground / table surface
    const groundY = h * PLATFORM_Y_RATIO;
    g.rect(0, groundY, w, h - groundY).fill({ color: 0x8D6E63 });
    g.rect(0, groundY, w, 4).fill({ color: 0x6D4C41 });
    // Wood grain lines
    for (let i = 0; i < 5; i++) {
      const ly = groundY + 15 + i * 18;
      g.moveTo(0, ly).lineTo(w, ly).stroke({ color: 0x795548, width: 1, alpha: 0.3 });
    }
  }, [app]);

  return <pixiGraphics draw={draw} />;
}

// ── Physics bodies renderer ──
function PhysicsRenderer({ world }: { world: PhysicsWorld }) {
  const gRef = useRef<any>(null);

  useTick(() => {
    const g = gRef.current;
    if (!g || !world.ready) return;
    g.clear();

    const bodies = world.getAllBodies();
    for (const body of bodies) {
      drawBody(g, body);
    }
  });

  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

function drawBody(g: any, body: BodyInfo) {
  const { x, y, rotation, width, height, shape, color, isStatic } = body;

  if (isStatic) {
    g.rect(x - width / 2, y - height / 2, width, height).fill({ color: 0x6D4C41 });
    return;
  }

  if (shape === 'ball') {
    const r = width / 2;
    // Shadow
    g.circle(x + 2, y + 2, r).fill({ color: 0x000000, alpha: 0.1 });
    // Main ball
    g.circle(x, y, r).fill({ color });
    // Shine
    g.circle(x - r * 0.25, y - r * 0.25, r * 0.3).fill({ color: 0xFFFFFF, alpha: 0.4 });
  } else {
    // Rotated rectangle: compute 4 corners
    const hw = width / 2;
    const hh = height / 2;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ].map((c) => ({
      x: x + c.x * cos - c.y * sin,
      y: y + c.x * sin + c.y * cos,
    }));

    // Shadow
    g.moveTo(corners[0].x + 2, corners[0].y + 2);
    for (let i = 1; i < 4; i++) g.lineTo(corners[i].x + 2, corners[i].y + 2);
    g.closePath().fill({ color: 0x000000, alpha: 0.1 });

    // Main block
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
    g.closePath().fill({ color });

    // Top edge highlight
    g.moveTo(corners[0].x, corners[0].y)
      .lineTo(corners[1].x, corners[1].y)
      .stroke({ color: 0xFFFFFF, width: 2, alpha: 0.25 });

    // Outline
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
    g.closePath().stroke({ color: 0x000000, width: 1, alpha: 0.15 });
  }
}

// ── Collision particles renderer ──
function ParticlesRenderer({ particles }: { particles: CollisionParticleSystem }) {
  const gRef = useRef<any>(null);
  useTick(() => {
    const g = gRef.current;
    if (!g) return;
    g.clear();
    particles.draw(g);
  });
  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

// ── Game scene ──
function GameScene({
  cursorRef,
  physicsWorld,
}: {
  cursorRef: React.RefObject<CursorState>;
  physicsWorld: PhysicsWorld;
}) {
  const { app } = useApplication();

  const gameTimeRef = useRef(0);
  const towerBlocksRef = useRef<TowerBlock[]>([]);
  const throwablesRef = useRef<Throwable[]>([]);
  const grabbedRef = useRef<Throwable | null>(null);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const invisibleTimeRef = useRef(0);
  const bodyVelocityHistoryRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const prevBodyPosRef = useRef({ x: 0, y: 0 });
  const towerClearTimerRef = useRef(0);
  const platformHandleRef = useRef(-1);

  const screenShake = useMemo(() => new ScreenShake(), []);
  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);
  const particles = useMemo(() => new CollisionParticleSystem(), []);

  const gameState = useGameStore((s) => s.state);
  const addScore = useGameStore((s) => s.addScore);
  const addBlocksToppled = useGameStore((s) => s.addBlocksToppled);
  const clearTower = useGameStore((s) => s.clearTower);
  const setTimeLeft = useGameStore((s) => s.setTimeLeft);
  const setState = useGameStore((s) => s.setState);

  // Was previously pinching (for edge detection)
  const wasPinchingRef = useRef(false);

  // Init / reset game world
  useEffect(() => {
    if (gameState === 'playing' && physicsWorld.ready) {
      physicsWorld.clear();
      const w = app?.screen.width ?? 800;
      const h = app?.screen.height ?? 600;
      const groundY = h * PLATFORM_Y_RATIO;

      // Add ground platform
      platformHandleRef.current = physicsWorld.addPlatform(w / 2, groundY + PLATFORM_THICKNESS / 2, w, PLATFORM_THICKNESS);

      // Add invisible walls on left and right edges (thick to prevent tunneling)
      const wallThickness = 200;
      const wallHeight = h * 2;
      physicsWorld.addPlatform(-wallThickness / 2, h / 2, wallThickness, wallHeight); // left wall
      physicsWorld.addPlatform(w + wallThickness / 2, h / 2, wallThickness, wallHeight); // right wall

      // Add a small pedestal for the tower
      const towerX = w * 0.65;
      physicsWorld.addPlatform(towerX, groundY - 2, 180, 4);

      // Build initial tower
      const towerLevel = useGameStore.getState().towerLevel;
      towerBlocksRef.current = buildTower(physicsWorld, towerLevel, w, h);

      // Spawn throwables
      throwablesRef.current = [];
      for (let i = 0; i < MAX_THROWABLES; i++) {
        throwablesRef.current.push(spawnThrowable(physicsWorld, w, h, i));
      }

      gameTimeRef.current = 0;
      towerClearTimerRef.current = 0;
      grabbedRef.current = null;
      wasPinchingRef.current = false;
    }
  }, [gameState, physicsWorld, app]);

  // Game tick
  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;

    screenShake.update(dt);
    floatingTexts.update(dt);
    particles.update(dt);

    if (app?.stage) {
      app.stage.position.set(screenShake.offsetX, screenShake.offsetY);
    }

    if (gameState !== 'playing' || !physicsWorld.ready) return;

    const screenW = app?.screen.width ?? 800;
    const screenH = app?.screen.height ?? 600;

    // Step physics
    physicsWorld.step(dt);
    physicsWorld.syncPositions();

    // Timer
    gameTimeRef.current += dt;
    const remaining = Math.max(0, GAME_DURATION - gameTimeRef.current);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      setState('result');
      return;
    }

    // ── Grab / Throw logic ──
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Track cursor visibility duration — tolerate brief flickers
    if (!cursor.visible) invisibleTimeRef.current += dt;
    else invisibleTimeRef.current = 0;

    // Pinch state: don't require cursor.visible (allow brief tracking drops)
    const isPinching = cursor.isPinching;
    const justPinched = isPinching && !wasPinchingRef.current;
    const justReleased = !isPinching && wasPinchingRef.current;
    wasPinchingRef.current = isPinching;

    // Force-release if cursor invisible for too long while grabbing
    const shouldForceRelease = invisibleTimeRef.current > 0.15 && !!grabbedRef.current;

    // Start grab (only when cursor is visible — need position for proximity check)
    if (justPinched && !grabbedRef.current && cursor.visible) {
      const nearest = findNearestThrowable(physicsWorld, throwablesRef.current, cursor.x, cursor.y, GRAB_RADIUS);
      if (nearest) {
        nearest.grabbed = true;
        grabbedRef.current = nearest;
        physicsWorld.setKinematic(nearest.handle);
        bodyVelocityHistoryRef.current = [];
        // Store grab offset so object doesn't snap to cursor center
        const bodyInfo = physicsWorld.getBody(nearest.handle);
        grabOffsetRef.current = bodyInfo
          ? { x: bodyInfo.x - cursor.x, y: bodyInfo.y - cursor.y }
          : { x: 0, y: 0 };
        prevBodyPosRef.current = bodyInfo
          ? { x: bodyInfo.x, y: bodyInfo.y }
          : { x: cursor.x, y: cursor.y };
        SFX.pop();
      }
    }

    // Move grabbed object — lerp toward cursor to avoid violent teleportation
    if (isPinching && grabbedRef.current && cursor.visible) {
      const bodyInfo = physicsWorld.getBody(grabbedRef.current.handle);
      if (bodyInfo) {
        const targetX = cursor.x + grabOffsetRef.current.x;
        const targetY = cursor.y + grabOffsetRef.current.y;
        const lerpFactor = 0.35;
        const newX = bodyInfo.x + (targetX - bodyInfo.x) * lerpFactor;
        const newY = bodyInfo.y + (targetY - bodyInfo.y) * lerpFactor;
        physicsWorld.moveKinematic(grabbedRef.current.handle, newX, newY);

        // Record body displacement velocity (much more reliable than cursor velocity)
        const bvx = (newX - prevBodyPosRef.current.x) / Math.max(dt, 0.001);
        const bvy = (newY - prevBodyPosRef.current.y) / Math.max(dt, 0.001);
        prevBodyPosRef.current = { x: newX, y: newY };
        // Only record meaningful movement
        if (Math.abs(bvx) > 5 || Math.abs(bvy) > 5) {
          bodyVelocityHistoryRef.current.push({ x: bvx, y: bvy, t: gameTimeRef.current });
          // Keep only recent 0.15s
          const cutoff = gameTimeRef.current - 0.15;
          while (bodyVelocityHistoryRef.current.length > 0 && bodyVelocityHistoryRef.current[0].t < cutoff) {
            bodyVelocityHistoryRef.current.shift();
          }
        }
      }
    }

    // Force-release: cursor invisible too long → drop gently
    if (shouldForceRelease) {
      const grabbed = grabbedRef.current!;
      grabbed.grabbed = false;
      physicsWorld.setDynamic(grabbed.handle, 0, 0);
      grabbedRef.current = null;
    }

    // Normal release / throw
    if (justReleased && !shouldForceRelease && grabbedRef.current) {
      const grabbed = grabbedRef.current;
      grabbed.grabbed = false;
      grabbed.thrown = true;

      // Use body velocity history (weighted toward most recent)
      const hist = bodyVelocityHistoryRef.current;
      let throwVx = 0, throwVy = 0;
      if (hist.length > 0) {
        const recent = hist.slice(-3);
        let totalWeight = 0;
        for (let i = 0; i < recent.length; i++) {
          const w = i + 1; // increasing weight for more recent
          throwVx += recent[i].x * w;
          throwVy += recent[i].y * w;
          totalWeight += w;
        }
        throwVx /= totalWeight;
        throwVy /= totalWeight;
      }

      // Cap maximum throw speed (pixels/s)
      const maxSpeed = 3000;
      const speed = Math.sqrt(throwVx * throwVx + throwVy * throwVy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        throwVx *= scale;
        throwVy *= scale;
      }

      physicsWorld.setDynamic(
        grabbed.handle,
        throwVx * THROW_SPEED_MULTIPLIER,
        throwVy * THROW_SPEED_MULTIPLIER,
      );
      grabbedRef.current = null;

      // Respawn a new throwable
      const newT = spawnThrowable(physicsWorld, screenW, screenH, throwablesRef.current.length % MAX_THROWABLES);
      throwablesRef.current.push(newT);
    }

    // ── Check toppled blocks ──
    const toppled = checkToppledBlocks(physicsWorld, towerBlocksRef.current, screenH);
    if (toppled.length > 0) {
      addScore(toppled.length * SCORE_PER_BLOCK);
      addBlocksToppled(toppled.length);
      for (const block of toppled) {
        const info = physicsWorld.getBody(block.handle);
        if (info) {
          particles.emit(info.x, info.y, block.color, 6);
          floatingTexts.add(`+${SCORE_PER_BLOCK}`, info.x, info.y - 20, '#FFD54F');
        }
      }
      screenShake.trigger(4, 0.1);
      SFX.pop();
    }

    // ── Check tower cleared ──
    if (isTowerCleared(towerBlocksRef.current) && towerClearTimerRef.current <= 0) {
      addScore(FULL_CLEAR_BONUS);
      clearTower();
      floatingTexts.add(`${sandboxTexts.fullClear[getLocale()]} +${FULL_CLEAR_BONUS}!`, screenW * 0.65, screenH * 0.4, '#FF7043');
      SFX.combo();
      screenShake.trigger(10, 0.2);
      towerClearTimerRef.current = 1.5; // delay before new tower
    }

    // New tower after delay
    if (towerClearTimerRef.current > 0) {
      towerClearTimerRef.current -= dt;
      if (towerClearTimerRef.current <= 0) {
        // Clean up old blocks
        for (const block of towerBlocksRef.current) {
          physicsWorld.removeBody(block.handle);
        }
        // Clean up thrown objects that went off screen
        for (const t of throwablesRef.current) {
          if (t.thrown) {
            physicsWorld.removeBody(t.handle);
          }
        }
        throwablesRef.current = throwablesRef.current.filter((t) => !t.thrown);

        // Build new tower
        const level = useGameStore.getState().towerLevel;
        towerBlocksRef.current = buildTower(physicsWorld, level, screenW, screenH);

        // Ensure enough throwables
        while (throwablesRef.current.filter((t) => !t.thrown && !t.grabbed).length < MAX_THROWABLES) {
          throwablesRef.current.push(spawnThrowable(physicsWorld, screenW, screenH, throwablesRef.current.length % MAX_THROWABLES));
        }
      }
    }

    // ── Cleanup bodies that fell way off screen ──
    for (const t of throwablesRef.current) {
      if (t.thrown) {
        const info = physicsWorld.getBody(t.handle);
        if (info && (info.y > screenH + 200 || info.x < -200 || info.x > screenW + 200)) {
          physicsWorld.removeBody(t.handle);
          t.thrown = false; // mark for cleanup
        }
      }
    }
  });

  return (
    <>
      <Background />
      <PhysicsRenderer world={physicsWorld} />
      <ParticlesRenderer particles={particles} />
    </>
  );
}

// ── Floating text HTML overlay ──
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

// ── Portrait lock overlay ──
function PortraitLock() {
  const { t } = useT(sandboxTexts);
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

  if (!isPortrait) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(180deg, #5C6BC0 0%, #3949AB 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', textAlign: 'center', fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'rotate-hint 1.5s ease-in-out infinite' }}>📱</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>{t('landscapePlz')}</h2>
      <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 280, lineHeight: 1.5 }}>
        {t('landscapeDesc')}
      </p>
      <style>{`
        @keyframes rotate-hint {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-90deg); }
          75% { transform: rotate(-90deg); }
        }
      `}</style>
    </div>
  );
}

// ── Main App ──
export function App() {
  const gameState = useGameStore((s) => s.state);
  const setState = useGameStore((s) => s.setState);
  const resetGame = useGameStore((s) => s.resetGame);
  useWakeLock(gameState !== 'idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [physicsReady, setPhysicsReady] = useState(false);
  const physicsWorld = useMemo(() => new PhysicsWorld(), []);
  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);

  // Track screen size for cursor coordinate mapping
  useEffect(() => {
    function onResize() { setScreenSize({ width: window.innerWidth, height: window.innerHeight }); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cursor from motion-engine
  const { cursorRef, detectorReady, error: trackingError } = useCursor(videoRef, screenSize);

  // Init camera
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
        if (!cancelled) setCameraError(common.cameraError[getLocale()]);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Init physics
  useEffect(() => {
    physicsWorld.init().then(() => setPhysicsReady(true));
    return () => physicsWorld.dispose();
  }, [physicsWorld]);

  const handleStart = useCallback(() => {
    unlockAudio();
    SFX.start();
    document.documentElement.requestFullscreen?.().catch(() => {});
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

  const loading = !cameraReady || !detectorReady || !physicsReady;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PortraitLock />
      <Application
        resizeTo={typeof window !== 'undefined' ? window : undefined}
        background="#E8EAF6"
        antialias
      >
        <GameScene cursorRef={cursorRef} physicsWorld={physicsWorld} />
      </Application>

      <CursorOverlay cursorRef={cursorRef} />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', right: 'calc(12px + env(safe-area-inset-right, 0px))',
          width: 160, height: 120, borderRadius: 12,
          objectFit: 'cover', transform: 'scaleX(-1)',
          opacity: 0.5, border: '2px solid rgba(255,255,255,0.3)',
          zIndex: 100, pointerEvents: 'none',
        }}
      />

      {gameState === 'idle' && (
        <StartScreen
          loading={loading}
          error={cameraError || trackingError}
          onStart={handleStart}
        />
      )}
      {gameState === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}
      {gameState === 'playing' && <HUD />}
      {gameState === 'result' && <ResultScreen onRestart={handleRestart} />}
    </div>
  );
}
