import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCamera, useHandTracking, useWakeLock } from '@motion-games/engine';
import type { Point2D } from '@motion-games/engine';
import texts from './i18n';
import { StartScreen } from './components/StartScreen';
import { useAppStore } from './store/useAppStore';
import { mapAllLandmarks } from './coord';
import { palmCenter, palmRadius, FINGERTIPS, FINGER_COLORS } from './constants';
import { drawLandmarkLines } from './effects/LandmarkLines';
import { drawMandala } from './effects/Mandala';
import { FingertipParticles } from './effects/FingertipParticles';
import { FingertipTrails } from './effects/FingertipTrails';
import { GestureDetector, type Gesture } from './effects/GestureDetector';

extend({ Container, Graphics, Sprite });

const NOOP_DRAW = () => {};

// ── Camera background as PixiJS Sprite ──
function CameraBackground({ videoEl }: { videoEl: HTMLVideoElement }) {
  const { app } = useApplication();
  const spriteRef = useRef<any>(null);
  const texRef = useRef<Texture | null>(null);

  useEffect(() => {
    const tex = Texture.from({ resource: videoEl, antialias: false });
    texRef.current = tex;
    if (spriteRef.current) spriteRef.current.texture = tex;
    return () => { tex.destroy(); };
  }, [videoEl]);

  useTick(() => {
    const sprite = spriteRef.current;
    if (!sprite || !app || !texRef.current) return;
    texRef.current.source.update();

    const sw = app.screen.width;
    const sh = app.screen.height;
    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;
    const scale = Math.max(sw / vw, sh / vh);
    sprite.width = vw * scale;
    sprite.height = vh * scale;
    sprite.scale.x = -Math.abs(sprite.scale.x);
    sprite.x = (sw + vw * scale) / 2;
    sprite.y = (sh - vh * scale) / 2;
  });

  return <pixiSprite ref={spriteRef} texture={texRef.current ?? Texture.EMPTY} />;
}

// ── AR Effects layer ──
function AREffects({
  landmarks,
  gesture,
  particles,
  trails,
}: {
  landmarks: Point2D[] | null;
  gesture: Gesture;
  particles: FingertipParticles;
  trails: FingertipTrails;
}) {
  const linesRef = useRef<any>(null);
  const mandalaRef = useRef<any>(null);
  const trailsRef = useRef<any>(null);
  const timeRef = useRef(0);

  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;
    timeRef.current += dt;

    particles.update(dt);
    trails.update(landmarks);

    const linesG = linesRef.current;
    const mandalaG = mandalaRef.current;
    const trailsG = trailsRef.current;
    if (!linesG || !mandalaG || !trailsG) return;

    linesG.clear();
    mandalaG.clear();
    trailsG.clear();

    // Always draw trails (they fade naturally when no hand)
    trails.draw(trailsG);

    if (!landmarks) return;

    if (gesture === 'open') {
      // Full effect: lines + mandala + particles
      drawLandmarkLines(linesG, landmarks);
      const center = palmCenter(landmarks);
      const radius = palmRadius(landmarks);
      if (Number.isFinite(center.x) && radius > 5) {
        drawMandala(mandalaG, center.x, center.y, radius, timeRef.current);
      }
      particles.emit(landmarks);
    } else if (gesture === 'fist') {
      // Fist: particles converge to palm center, energy gathering effect
      const center = palmCenter(landmarks);
      if (Number.isFinite(center.x)) {
        // Emit concentrated particles at palm center
        const fakeLandmarks = landmarks.map((_, i) =>
          FINGERTIPS.includes(i) ? center : landmarks[i],
        );
        particles.emit(fakeLandmarks);
        // Draw pulsing energy circle at palm
        const radius = palmRadius(landmarks);
        const pulse = 0.7 + Math.sin(timeRef.current * 6) * 0.3;
        mandalaG.circle(center.x, center.y, radius * 0.5 * pulse)
          .fill({ color: 0xFF4444, alpha: 0.15 });
        mandalaG.circle(center.x, center.y, radius * 0.3 * pulse)
          .fill({ color: 0xFFAA00, alpha: 0.25 });
        mandalaG.circle(center.x, center.y, 6)
          .fill({ color: 0xFFFFFF, alpha: 0.9 });
      }
    } else if (gesture === 'point') {
      // Point: laser beam shooting from fingertip along finger direction
      const tip = landmarks[8];  // INDEX_TIP
      const pip = landmarks[6];  // INDEX_PIP
      if (Number.isFinite(tip.x) && Number.isFinite(pip.x)) {
        const dx = tip.x - pip.x;
        const dy = tip.y - pip.y;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const nx = dx / len;
          const ny = dy / len;
          // Beam extends far from fingertip (2000px)
          const beamLen = 2000;
          const ex = tip.x + nx * beamLen;
          const ey = tip.y + ny * beamLen;
          const t = timeRef.current;
          const flicker = 0.85 + Math.sin(t * 20) * 0.1 + Math.sin(t * 47) * 0.05;

          // Outer glow (wide, faint)
          mandalaG.setStrokeStyle({ width: 20 * flicker, color: 0xFF4400, alpha: 0.08, cap: 'round' });
          mandalaG.moveTo(tip.x, tip.y);
          mandalaG.lineTo(ex, ey);
          mandalaG.stroke();
          // Mid glow
          mandalaG.setStrokeStyle({ width: 10 * flicker, color: 0xFF6600, alpha: 0.2, cap: 'round' });
          mandalaG.moveTo(tip.x, tip.y);
          mandalaG.lineTo(ex, ey);
          mandalaG.stroke();
          // Core beam (bright, narrow)
          mandalaG.setStrokeStyle({ width: 3, color: 0xFFCC44, alpha: 0.9 * flicker, cap: 'round' });
          mandalaG.moveTo(tip.x, tip.y);
          mandalaG.lineTo(ex, ey);
          mandalaG.stroke();

          // Fingertip glow point
          const pulse = 0.7 + Math.sin(t * 15) * 0.3;
          mandalaG.circle(tip.x, tip.y, 12 * pulse).fill({ color: 0xFF6600, alpha: 0.2 });
          mandalaG.circle(tip.x, tip.y, 6 * pulse).fill({ color: 0xFFAA00, alpha: 0.45 });
          mandalaG.circle(tip.x, tip.y, 3).fill({ color: 0xFFFFFF, alpha: 0.95 });
        }
      }
    }
  });

  return (
    <>
      <pixiGraphics ref={trailsRef} draw={NOOP_DRAW} />
      <pixiGraphics ref={linesRef} draw={NOOP_DRAW} />
      <pixiGraphics ref={mandalaRef} draw={NOOP_DRAW} />
    </>
  );
}

// ── Bloom layer ──
function BloomLayer({
  landmarks,
  gesture,
  trails,
}: {
  landmarks: Point2D[] | null;
  gesture: Gesture;
  trails: FingertipTrails;
}) {
  const linesRef = useRef<any>(null);
  const mandalaRef = useRef<any>(null);
  const trailsRef = useRef<any>(null);
  const timeRef = useRef(0);

  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;
    timeRef.current += dt;

    const linesG = linesRef.current;
    const mandalaG = mandalaRef.current;
    const trailsG = trailsRef.current;
    if (!linesG || !mandalaG || !trailsG) return;

    linesG.clear();
    mandalaG.clear();
    trailsG.clear();

    // Bloom on trails
    trails.draw(trailsG);

    if (!landmarks) return;

    if (gesture === 'open') {
      drawLandmarkLines(linesG, landmarks);
      const center = palmCenter(landmarks);
      const radius = palmRadius(landmarks);
      if (Number.isFinite(center.x) && radius > 5) {
        drawMandala(mandalaG, center.x, center.y, radius, timeRef.current);
      }
    } else if (gesture === 'point') {
      // Bloom duplicate of the laser beam for glow effect
      const tip = landmarks[8];
      const pip = landmarks[6];
      if (Number.isFinite(tip.x) && Number.isFinite(pip.x)) {
        const dx = tip.x - pip.x;
        const dy = tip.y - pip.y;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const nx = dx / len;
          const ny = dy / len;
          const ex = tip.x + nx * 2000;
          const ey = tip.y + ny * 2000;
          mandalaG.setStrokeStyle({ width: 12, color: 0xFF6600, alpha: 0.5, cap: 'round' });
          mandalaG.moveTo(tip.x, tip.y);
          mandalaG.lineTo(ex, ey);
          mandalaG.stroke();
        }
      }
    }
  });

  const blurFilter = useMemo(() => new BlurFilter({ strength: 8, quality: 2 }), []);

  return (
    <pixiContainer alpha={0.4} filters={[blurFilter]} blendMode="add">
      <pixiGraphics ref={trailsRef} draw={NOOP_DRAW} />
      <pixiGraphics ref={linesRef} draw={NOOP_DRAW} />
      <pixiGraphics ref={mandalaRef} draw={NOOP_DRAW} />
    </pixiContainer>
  );
}

// ── Gesture indicator HUD ──
function GestureHUD({ gesture }: { gesture: Gesture }) {
  const labels: Record<Gesture, string> = { open: '✋ 法阵', fist: '✊ 聚能', point: '☝️ 激光' };
  return (
    <div style={{
      position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', left: '50%',
      transform: 'translateX(-50%)', zIndex: 100, pointerEvents: 'none',
      background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 16,
      padding: '4px 14px', fontSize: 14, fontWeight: 600, backdropFilter: 'blur(8px)',
    }}>
      {labels[gesture]}
    </div>
  );
}

// ── Main scene ──
function Scene({
  videoEl,
  landmarks,
  gesture,
}: {
  videoEl: HTMLVideoElement | null;
  landmarks: Point2D[] | null;
  gesture: Gesture;
}) {
  const particles = useMemo(() => new FingertipParticles(), []);
  const trails = useMemo(() => new FingertipTrails(), []);

  useEffect(() => () => particles.destroy(), [particles]);

  return (
    <>
      {videoEl && <CameraBackground videoEl={videoEl} />}
      <BloomLayer landmarks={landmarks} gesture={gesture} trails={trails} />
      <AREffects landmarks={landmarks} gesture={gesture} particles={particles} trails={trails} />
      <pixiContainer ref={(ref: any) => {
        if (ref && !ref.children.some((c: any) => c === particles.container)) {
          ref.addChild(particles.container);
        }
      }} />
    </>
  );
}

// ── Main App ──
export function App() {
  const appState = useAppStore((s) => s.state);
  const setState = useAppStore((s) => s.setState);
  useWakeLock(appState === 'active');

  const { videoRef, isReady: cameraReady, error: cameraError } = useCamera();
  const { hand, detectorReady, error: trackingError } = useHandTracking(videoRef);

  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const gestureDetector = useMemo(() => new GestureDetector(), []);
  const [gesture, setGesture] = useState<Gesture>('open');

  useEffect(() => {
    function onResize() { setScreenSize({ width: window.innerWidth, height: window.innerHeight }); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const stageLandmarks = useMemo(() => {
    if (!hand) return null;
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    return mapAllLandmarks(hand.landmarks, vw, vh, screenSize.width, screenSize.height);
  }, [hand, screenSize, videoRef]);

  // Detect gesture from raw landmarks (before stage mapping — doesn't matter for distance ratios)
  useEffect(() => {
    if (!hand) return;
    const g = gestureDetector.detect(hand.landmarks);
    setGesture(g);
  }, [hand, gestureDetector]);

  const handleStart = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setState('active');
  }, [setState]);

  const videoEl = cameraReady ? videoRef.current : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <Application
        resizeTo={typeof window !== 'undefined' ? window : undefined}
        background="#000000"
        antialias
      >
        <Scene videoEl={videoEl} landmarks={stageLandmarks} gesture={gesture} />
      </Application>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />

      {appState === 'active' && <GestureHUD gesture={gesture} />}

      {appState === 'idle' && (
        <StartScreen
          loading={!cameraReady || !detectorReady}
          error={cameraError || trackingError}
          onStart={handleStart}
        />
      )}
    </div>
  );
}
