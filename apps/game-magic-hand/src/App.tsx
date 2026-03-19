import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Application, extend, useApplication, useTick } from '@pixi/react';
import { BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCamera, useHandTracking, useT, getLocale, common } from '@motion-games/engine';
import type { Point2D } from '@motion-games/engine';
import texts from './i18n';
import { StartScreen } from './components/StartScreen';
import { useAppStore } from './store/useAppStore';
import { mapAllLandmarks } from './coord';
import { palmCenter, palmRadius } from './constants';
import { drawLandmarkLines } from './effects/LandmarkLines';
import { drawMandala } from './effects/Mandala';
import { FingertipParticles } from './effects/FingertipParticles';

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

    // Update video texture each frame
    texRef.current.source.update();

    const sw = app.screen.width;
    const sh = app.screen.height;
    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;

    // Cover mode: scale to fill, center, mirror for front camera
    const scale = Math.max(sw / vw, sh / vh);
    sprite.width = vw * scale;
    sprite.height = vh * scale;
    // Mirror horizontally: flip around center
    sprite.scale.x = -Math.abs(sprite.scale.x);
    sprite.x = (sw + vw * scale) / 2;
    sprite.y = (sh - vh * scale) / 2;
  });

  return <pixiSprite ref={spriteRef} texture={texRef.current ?? Texture.EMPTY} />;
}

// ── AR Effects layer: landmark lines + mandala + particles ──
function AREffects({
  landmarks,
  particles,
}: {
  landmarks: Point2D[] | null;
  particles: FingertipParticles;
}) {
  const linesRef = useRef<any>(null);
  const mandalaRef = useRef<any>(null);
  const timeRef = useRef(0);

  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;
    timeRef.current += dt;

    // Update particles
    particles.update(dt);

    const linesG = linesRef.current;
    const mandalaG = mandalaRef.current;
    if (!linesG || !mandalaG) return;

    linesG.clear();
    mandalaG.clear();

    if (!landmarks) return;

    // Draw landmark connections
    drawLandmarkLines(linesG, landmarks);

    // Draw palm mandala
    const center = palmCenter(landmarks);
    const radius = palmRadius(landmarks);
    if (Number.isFinite(center.x) && radius > 5) {
      drawMandala(mandalaG, center.x, center.y, radius, timeRef.current);
    }

    // Emit fingertip particles
    particles.emit(landmarks);
  });

  return (
    <>
      <pixiGraphics ref={linesRef} draw={NOOP_DRAW} />
      <pixiGraphics ref={mandalaRef} draw={NOOP_DRAW} />
    </>
  );
}

// ── Bloom layer: blurred copy of effects for glow ──
function BloomLayer({
  landmarks,
  particles,
}: {
  landmarks: Point2D[] | null;
  particles: FingertipParticles;
}) {
  const linesRef = useRef<any>(null);
  const mandalaRef = useRef<any>(null);
  const timeRef = useRef(0);

  useTick(({ deltaTime }) => {
    const dt = deltaTime / 60;
    timeRef.current += dt;

    const linesG = linesRef.current;
    const mandalaG = mandalaRef.current;
    if (!linesG || !mandalaG) return;

    linesG.clear();
    mandalaG.clear();

    if (!landmarks) return;

    drawLandmarkLines(linesG, landmarks);

    const center = palmCenter(landmarks);
    const radius = palmRadius(landmarks);
    if (Number.isFinite(center.x) && radius > 5) {
      drawMandala(mandalaG, center.x, center.y, radius, timeRef.current);
    }
  });

  const blurFilter = useMemo(() => new BlurFilter({ strength: 8, quality: 2 }), []);

  return (
    <pixiContainer alpha={0.4} filters={[blurFilter]} blendMode="add">
      <pixiGraphics ref={linesRef} draw={NOOP_DRAW} />
      <pixiGraphics ref={mandalaRef} draw={NOOP_DRAW} />
    </pixiContainer>
  );
}

// ── Main scene inside PixiJS Application ──
function Scene({
  videoEl,
  landmarks,
}: {
  videoEl: HTMLVideoElement | null;
  landmarks: Point2D[] | null;
}) {
  const particles = useMemo(() => new FingertipParticles(), []);

  useEffect(() => () => particles.destroy(), [particles]);

  return (
    <>
      {videoEl && <CameraBackground videoEl={videoEl} />}
      <BloomLayer landmarks={landmarks} particles={particles} />
      <AREffects landmarks={landmarks} particles={particles} />
      {/* ParticleContainer rendered directly via ref */}
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

  const { videoRef, isReady: cameraReady, error: cameraError } = useCamera();
  const { hand, detectorReady, error: trackingError } = useHandTracking(videoRef);

  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    function onResize() { setScreenSize({ width: window.innerWidth, height: window.innerHeight }); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Map hand landmarks from video coords to stage coords (cover mode)
  const stageLandmarks = useMemo(() => {
    if (!hand) return null;
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    return mapAllLandmarks(hand.landmarks, vw, vh, screenSize.width, screenSize.height);
  }, [hand, screenSize, videoRef]);

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
        <Scene videoEl={videoEl} landmarks={stageLandmarks} />
      </Application>

      {/* Hidden video element for camera feed + hand detection */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />

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
