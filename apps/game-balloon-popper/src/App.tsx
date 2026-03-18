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

// Stable empty draw — must never change reference, otherwise @pixi/react
// calls clear() + draw() on every re-render, wiping useTick output.
const NOOP_DRAW = () => {};

// ── Background with gradient sky ──
function Background() {
  const { app } = useApplication();
  const draw = useCallback((g: any) => {
    g.clear();
    const w = app?.screen.width ?? 800;
    const h = app?.screen.height ?? 600;
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(0x87 + (0xE0 - 0x87) * t);
      const gv = Math.round(0xCE + (0xF0 - 0xCE) * t);
      const b = Math.round(0xEB + (0xFF - 0xEB) * t);
      const color = (r << 16) | (gv << 8) | b;
      g.rect(0, (h * i) / steps, w, h / steps + 1).fill({ color });
    }
    g.rect(0, h - 40, w, 40).fill({ color: 0x7CB342 });
    g.rect(0, h - 42, w, 4).fill({ color: 0x8BC34A });
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
function EffectsRenderer({ particles }: { particles: PopParticleSystem }) {
  const gRef = useRef<any>(null);
  useTick(() => {
    const g = gRef.current;
    if (!g) return;
    g.clear();
    particles.draw(g);
  });
  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

// ── Balloon renderer ──
function BalloonRenderer({ balloons }: { balloons: React.RefObject<BalloonState[]> }) {
  const gRef = useRef<any>(null);
  useTick(() => {
    const g = gRef.current;
    if (!g) return;
    g.clear();
    for (const b of balloons.current!) {
      if (!b.alive) continue;
      const r = b.radius * b.scale;
      if (b.type === 'bomb') {
        g.circle(b.x, b.y, r).fill({ color: 0x333333, alpha: 0.9 });
        g.circle(b.x, b.y, r).stroke({ color: 0xFF4444, width: 3 });
        const s = r * 0.4;
        g.moveTo(b.x - s, b.y - s).lineTo(b.x + s, b.y + s).stroke({ color: 0xFF4444, width: 2.5 });
        g.moveTo(b.x + s, b.y - s).lineTo(b.x - s, b.y + s).stroke({ color: 0xFF4444, width: 2.5 });
        g.moveTo(b.x, b.y - r).lineTo(b.x + 8, b.y - r - 15).stroke({ color: 0xFF8800, width: 2 });
        g.circle(b.x + 8, b.y - r - 15, 3).fill({ color: 0xFFFF00, alpha: 0.8 + Math.sin(b.breathPhase * 5) * 0.2 });
      } else {
        g.circle(b.x, b.y, r).fill({ color: b.color, alpha: 0.85 });
        g.circle(b.x - r * 0.25, b.y - r * 0.3, r * 0.25).fill({ color: 0xFFFFFF, alpha: 0.4 });
        g.circle(b.x - r * 0.15, b.y - r * 0.15, r * 0.1).fill({ color: 0xFFFFFF, alpha: 0.6 });
        g.circle(b.x, b.y + r, 3).fill({ color: b.color, alpha: 0.7 });
        g.moveTo(b.x, b.y + r + 3)
          .quadraticCurveTo(b.x + 6, b.y + r + 22, b.x - 4, b.y + r + 40)
          .stroke({ color: 0x999999, width: 1.5, alpha: 0.5 });
      }
    }
  });
  return <pixiGraphics ref={gRef} draw={NOOP_DRAW} />;
}

// ── Cursor state shared between GameScene and App ──
interface CursorState {
  x: number;
  y: number;
  isPinching: boolean;
  visible: boolean;
}

// ── Game scene (runs inside PixiJS Application) ──
function GameScene({
  videoRef,
  cursorRef,
  onTrackingStatus,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cursorRef: React.MutableRefObject<CursorState>;
  onTrackingStatus?: (status: { detectorReady: boolean; hasHand: boolean; error: string | null }) => void;
}) {
  const { app } = useApplication();
  const balloonsRef = useRef<BalloonState[]>([]);
  const spawnTimerRef = useRef(0);
  const gameTimeRef = useRef(0);

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

  // Always enabled — model starts loading immediately, not after countdown
  const { hand, detectorReady, error } = useHandTracking(videoRef, true);

  // Report tracking status to parent
  useEffect(() => {
    onTrackingStatus?.({ detectorReady, hasHand: !!hand, error });
  }, [detectorReady, !!hand, error, onTrackingStatus]);

  const pinchState = usePinchDetector(
    hand,
    videoRef.current?.videoWidth || 640,
  );

  // Pop cooldown: continuous collision while pinching, 300ms between pops
  const popCooldownRef = useRef(0);

  // Update cursor position (shared via ref, rendered as HTML overlay)
  const showCursor = !!hand && (gameState === 'playing' || gameState === 'countdown');
  if (hand && app) {
    const w = app.screen.width ?? 0;
    const h = app.screen.height ?? 0;
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    const cx = (hand.indexTip.x / vw) * w;
    const cy = (hand.indexTip.y / vh) * h;
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      cursorRef.current = {
        x: cx, y: cy,
        isPinching: pinchState.isPinching,
        visible: showCursor,
      };
    }
  } else {
    cursorRef.current = { ...cursorRef.current, visible: showCursor };
  }

  // Game tick
  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;

    particles.update(dt);
    floatingTexts.update(dt);
    screenShake.update(dt);

    if (app?.stage) {
      app.stage.position.set(screenShake.offsetX, screenShake.offsetY);
    }

    if (gameState !== 'playing') return;

    const balloons = balloonsRef.current;
    const screenW = app?.screen.width ?? 800;
    const screenH = app?.screen.height ?? 600;

    // Continuous pinch-to-pop: check collision every frame while pinching
    popCooldownRef.current = Math.max(0, popCooldownRef.current - dt);
    const cursor = cursorRef.current;
    if (cursor.isPinching && popCooldownRef.current <= 0) {
      const hit = findHitBalloon(cursor.x, cursor.y, balloons);
      if (hit) {
        hit.alive = false;
        popCooldownRef.current = 0.3; // 300ms cooldown
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
    }

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

  return (
    <>
      <Background />
      <BalloonRenderer balloons={balloonsRef} />
      <EffectsRenderer particles={particles} />
    </>
  );
}

// ── HTML Cursor overlay with interpolation for smooth movement ──
function CursorOverlay({ cursorRef }: { cursorRef: React.MutableRefObject<CursorState> }) {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let running = true;
    // Interpolated position for smooth 60fps rendering
    let lerpX = 0, lerpY = 0;
    const LERP = 0.35; // 0 = frozen, 1 = instant snap

    function loop() {
      if (!running) return;
      const ring = ringRef.current;
      const c = cursorRef.current;
      if (ring) {
        if (c.visible && c.x > 0 && c.y > 0) {
          // Lerp toward target for smooth motion between tracking frames
          lerpX += (c.x - lerpX) * LERP;
          lerpY += (c.y - lerpY) * LERP;
          ring.style.display = 'block';
          ring.style.transform = `translate(${lerpX}px, ${lerpY}px)`;
          if (c.isPinching) {
            ring.style.width = '28px';
            ring.style.height = '28px';
            ring.style.marginLeft = '-14px';
            ring.style.marginTop = '-14px';
            ring.style.borderColor = '#FFD54F';
            ring.style.background = 'rgba(255, 213, 79, 0.5)';
            ring.style.boxShadow = '0 0 24px rgba(255,213,79,0.6)';
          } else {
            ring.style.width = '52px';
            ring.style.height = '52px';
            ring.style.marginLeft = '-26px';
            ring.style.marginTop = '-26px';
            ring.style.borderColor = 'rgba(255,255,255,0.8)';
            ring.style.background = 'rgba(255,255,255,0.1)';
            ring.style.boxShadow = '0 0 16px rgba(255,255,255,0.3)';
          }
        } else {
          ring.style.display = 'none';
          lerpX = c.x;
          lerpY = c.y;
        }
      }
      requestAnimationFrame(loop);
    }
    loop();
    return () => { running = false; };
  }, [cursorRef]);

  return (
    <div
      ref={ringRef}
      style={{
        position: 'fixed', left: 0, top: 0,
        display: 'none',
        width: 52, height: 52,
        marginLeft: -26, marginTop: -26,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.8)',
        zIndex: 80,
        pointerEvents: 'none',
      }}
    />
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
            transition: 'none',
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
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth,
  );

  useEffect(() => {
    function check() {
      setIsPortrait(window.innerHeight > window.innerWidth);
    }
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
      background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', textAlign: 'center', fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'rotate-hint 1.5s ease-in-out infinite' }}>
        📱
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
        请横屏使用
      </h2>
      <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 280, lineHeight: 1.5 }}>
        将设备旋转为横屏模式以获得最佳游戏体验
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cursorRef = useRef<CursorState>({ x: 0, y: 0, isPinching: false, visible: false });
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState({ detectorReady: false, hasHand: false, error: null as string | null });
  const floatingTexts = useMemo(() => new FloatingTextSystem(), []);
  const handleTrackingStatus = useCallback((s: { detectorReady: boolean; hasHand: boolean; error: string | null }) => {
    setTrackingStatus(s);
  }, []);

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
    // Request fullscreen to hide browser chrome
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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PortraitLock />
      <Application
        resizeTo={typeof window !== 'undefined' ? window : undefined}
        background="#87CEEB"
        antialias
      >
        <GameScene videoRef={videoRef} cursorRef={cursorRef} onTrackingStatus={handleTrackingStatus} />
      </Application>

      {/* HTML cursor overlay — always reliable, bypasses PixiJS */}
      <CursorOverlay cursorRef={cursorRef} />

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
        <StartScreen
          loading={!cameraReady || !trackingStatus.detectorReady}
          error={cameraError || trackingStatus.error}
          onStart={handleStart}
        />
      )}
      {gameState === 'countdown' && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}
      {gameState === 'playing' && <HUD />}
      {gameState === 'result' && <ResultScreen onRestart={handleRestart} />}

      {/* Tracking status indicator */}
      {(gameState === 'playing' || gameState === 'countdown') && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600,
          zIndex: 150, pointerEvents: 'none',
          background: trackingStatus.error
            ? 'rgba(255,60,60,0.85)'
            : trackingStatus.hasHand
              ? 'rgba(76,175,80,0.85)'
              : trackingStatus.detectorReady
                ? 'rgba(255,193,7,0.85)'
                : 'rgba(0,0,0,0.6)',
          color: '#fff',
        }}>
          {trackingStatus.error
            ? `追踪出错: ${trackingStatus.error}`
            : trackingStatus.hasHand
              ? '✋ 已识别到手 — 捏合拇指食指戳气球'
              : trackingStatus.detectorReady
                ? '请伸出手掌对准摄像头...'
                : '正在加载手部识别模型...'}
        </div>
      )}
    </div>
  );
}
