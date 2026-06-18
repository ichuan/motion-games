import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  common, getLocale, useCamera, useHandTracking, useT, useWakeLock,
  type Point2D,
} from '@motion-games/engine';
import texts from './i18n';
import { GestureClassifier } from './gesture/GestureClassifier';
import type { PaintGesture } from './gesture/types';
import {
  getPaletteLayout, hitTestPalette, isInsideDrawingArea, videoToScreen,
} from './paint/layout';
import { ExitButton } from './ExitButton';

const BRUSH_SIZE = 10;
const ERASER_SIZE = 34;
const MIN_DRAW_DISTANCE = 3.5;
const CLEAR_HOLD_MS = 600;
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: false,
};

interface PointerState {
  visible: boolean;
  x: number;
  y: number;
  gesture: PaintGesture;
}

function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawLine(ctx: CanvasRenderingContext2D, from: Point2D, to: Point2D, color: string) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = BRUSH_SIZE;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, point: Point2D, color: string) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, BRUSH_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function eraseAt(ctx: CanvasRenderingContext2D, point: Point2D) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(point.x, point.y, ERASER_SIZE, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function StartScreen({
  loading,
  error,
  onStart,
}: {
  loading: boolean;
  error: string | null;
  onStart: () => void;
}) {
  const { t, locale, switchLocale } = useT(texts);

  return (
    <div className="start-screen">
      <button
        className="lang-button"
        onClick={() => switchLocale(locale === 'zh' ? 'en' : 'zh')}
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </button>
      <div className="start-mark">✍️</div>
      <h1>{t('title')}</h1>
      <p className="start-subtitle">{t('subtitle')}</p>
      <div className="start-instructions">
        <div>{t('inst1')}</div>
        <div>{t('inst2')}</div>
        <div>{t('inst3')}</div>
      </div>
      {error ? (
        <div className="error-box">{error}</div>
      ) : (
        <button className="start-button" disabled={loading} onClick={onStart}>
          {loading ? t('loadingModel') : t('startBtn')}
        </button>
      )}
      {loading && !error && <p className="load-note">{t('firstLoad')}</p>}
      <a className="back-link" href="/">{t('backToHub')}</a>
    </div>
  );
}

export function App() {
  const { t } = useT(texts);
  const [started, setStarted] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [colorIndex, setColorIndex] = useState(0);
  const [gesture, setGesture] = useState<PaintGesture>('none');
  const [pointer, setPointer] = useState<PointerState>({
    visible: false,
    x: 0,
    y: 0,
    gesture: 'none',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const classifierRef = useRef(new GestureClassifier({ hysteresisFrames: 8 }));
  const lastPointRef = useRef<Point2D | null>(null);
  const thumbDownStartedAtRef = useRef<number | null>(null);
  const didClearRef = useRef(false);

  const { videoRef, isReady: cameraReady, error: cameraError } = useCamera(started, CAMERA_CONSTRAINTS);
  const { hand, detectorReady, error: trackingError } = useHandTracking(videoRef, started && cameraReady);
  const palette = useMemo(
    () => getPaletteLayout(screenSize.width, screenSize.height),
    [screenSize],
  );
  const currentColor = palette.swatches[colorIndex]?.color ?? palette.swatches[0].color;
  const error = cameraError || trackingError;
  const loading = started && !error && (!cameraReady || !detectorReady);
  const active = started && !loading && !error;
  const showStart = !active;

  useWakeLock(active);

  useEffect(() => {
    function onResize() {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas(canvas, screenSize.width, screenSize.height);
    lastPointRef.current = null;
  }, [screenSize]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const video = videoRef.current;
    const rawGesture = classifierRef.current.detect(hand?.landmarks ?? null);
    setGesture(rawGesture);

    if (!canvas || !ctx || !video || !hand) {
      setPointer((prev) => ({ ...prev, visible: false, gesture: rawGesture }));
      if (rawGesture === 'none') lastPointRef.current = null;
      return;
    }

    const tip = videoToScreen(
      hand.indexTip,
      video.videoWidth || 640,
      video.videoHeight || 480,
      screenSize.width,
      screenSize.height,
    );

    setPointer({ visible: true, x: tip.x, y: tip.y, gesture: rawGesture });

    if (rawGesture !== 'thumbDown') {
      thumbDownStartedAtRef.current = null;
      didClearRef.current = false;
    }

    if (rawGesture === 'twoFingers') {
      const hit = hitTestPalette(tip, palette);
      if (hit && hit.index !== colorIndex) setColorIndex(hit.index);
      lastPointRef.current = null;
      return;
    }

    if (rawGesture === 'openPalm') {
      eraseAt(ctx, tip);
      lastPointRef.current = null;
      return;
    }

    if (rawGesture === 'thumbDown') {
      const now = performance.now();
      thumbDownStartedAtRef.current ??= now;
      if (!didClearRef.current && now - thumbDownStartedAtRef.current >= CLEAR_HOLD_MS) {
        ctx.clearRect(0, 0, screenSize.width, screenSize.height);
        didClearRef.current = true;
      }
      lastPointRef.current = null;
      return;
    }

    if (rawGesture !== 'point' || !isInsideDrawingArea(tip, screenSize.height)) {
      lastPointRef.current = null;
      return;
    }

    const previous = lastPointRef.current;
    if (!previous) {
      drawDot(ctx, tip, currentColor);
      lastPointRef.current = tip;
      return;
    }

    if (Math.hypot(tip.x - previous.x, tip.y - previous.y) >= MIN_DRAW_DISTANCE) {
      drawLine(ctx, previous, tip, currentColor);
      lastPointRef.current = tip;
    }
  }, [active, colorIndex, currentColor, hand, palette, screenSize, videoRef]);

  const handleStart = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setStarted(true);
  }, []);

  return (
    <div className="app-shell">
      <video
        ref={videoRef}
        className="camera-feed"
        autoPlay
        playsInline
        muted
      />

      <canvas ref={canvasRef} className="paint-canvas" />

      {active && (
        <>
          <div
            className={`finger-cursor gesture-${pointer.gesture}`}
            style={{
              opacity: pointer.visible ? 1 : 0,
              transform: `translate(${pointer.x}px, ${pointer.y}px)`,
              borderColor: currentColor,
            }}
          />

          <div className="status-panel">
            <span className="status-dot" style={{ background: currentColor }} />
            <span>{t('current')}: {t(gesture)}</span>
          </div>

          <ExitButton ariaLabel={t('backToHub')} />

          <div
            className="palette"
            style={{ '--palette-band-height': `${palette.bandHeight}px` } as React.CSSProperties}
          >
            {palette.swatches.map((swatch) => (
              <div
                key={swatch.index}
                className={`swatch ${swatch.index === colorIndex ? 'selected' : ''}`}
                style={{
                  background: swatch.color,
                  left: swatch.x,
                  top: swatch.y,
                  width: swatch.radius * 2,
                  height: swatch.radius * 2,
                }}
              />
            ))}
          </div>
        </>
      )}

      {showStart && (
        <StartScreen
          loading={loading}
          error={error ? error || common.cameraError[getLocale()] : null}
          onStart={handleStart}
        />
      )}
    </div>
  );
}
