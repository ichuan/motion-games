import { useEffect, useRef, useState } from 'react';
import { createHandDetector, type HandDetector } from '../tracking/hand-detector';
import { EMAFilter } from '../filter/ema';
import type { SmoothedHand, TrackingResult, Point2D } from '../tracking/types';

const NUM_LANDMARKS = 21;
// Fixed canvas size fed to the model — always landscape, avoids letterbox NaN bug
const MODEL_W = 640;
const MODEL_H = 480;

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true,
): TrackingResult & { detectorReady: boolean; error: string | null } {
  const [result, setResult] = useState<TrackingResult>({ hand: null, isTracking: false });
  const [detectorReady, setDetectorReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<HandDetector | null>(null);
  const filtersRef = useRef<EMAFilter[]>([]);
  const busyRef = useRef(false);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // Create offscreen canvas for normalizing video to landscape
    const canvas = document.createElement('canvas');
    canvas.width = MODEL_W;
    canvas.height = MODEL_H;
    canvasRef.current = canvas;

    async function init() {
      try {
        const detector = await createHandDetector();
        if (cancelled) { detector.dispose(); return; }
        detectorRef.current = detector;
        filtersRef.current = Array.from({ length: NUM_LANDMARKS }, () => new EMAFilter(0.4));

        // warm up: 3 dummy frames using canvas
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, MODEL_W, MODEL_H);
          for (let i = 0; i < 3; i++) {
            await detector.estimateHands(canvas);
          }
        }
        if (!cancelled) setDetectorReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    init();
    return () => {
      cancelled = true;
      detectorRef.current?.dispose();
      detectorRef.current = null;
    };
  }, [enabled, videoRef]);

  useEffect(() => {
    if (!detectorReady || !enabled) return;

    function tick() {
      const video = videoRef.current;
      const detector = detectorRef.current;
      const canvas = canvasRef.current;
      if (!video || !detector || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!busyRef.current) {
        busyRef.current = true;

        // Draw video onto fixed-size landscape canvas
        const ctx = canvas.getContext('2d')!;
        // Mirror horizontally (front camera) and fit to canvas
        ctx.save();
        ctx.translate(MODEL_W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, MODEL_W, MODEL_H);
        ctx.restore();

        detector.estimateHands(canvas).then((hands) => {
          busyRef.current = false;
          if (hands.length === 0) {
            setResult({ hand: null, isTracking: false });
            return;
          }

          const raw = hands[0].keypoints;
          if (!raw || raw.length < 21) {
            setResult({ hand: null, isTracking: false });
            return;
          }

          const filters = filtersRef.current;
          const vw = video.videoWidth || MODEL_W;
          const vh = video.videoHeight || MODEL_H;

          const smoothed: Point2D[] = raw.map((kp: any, i: number) => {
            let x = typeof kp.x === 'number' && Number.isFinite(kp.x) ? kp.x : NaN;
            let y = typeof kp.y === 'number' && Number.isFinite(kp.y) ? kp.y : NaN;

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return filters[i].update(NaN, NaN);
            }

            // Map from canvas coords (MODEL_W x MODEL_H) to video coords (vw x vh)
            x = (x / MODEL_W) * vw;
            y = (y / MODEL_H) * vh;
            return filters[i].update(x, y);
          });

          const thumbTip = smoothed[4];
          const indexTip = smoothed[8];

          if (!Number.isFinite(indexTip.x) || !Number.isFinite(indexTip.y)) {
            return;
          }

          const hand: SmoothedHand = {
            landmarks: smoothed,
            thumbTip,
            indexTip,
          };
          setResult({ hand, isTracking: true });
        }).catch(() => {
          busyRef.current = false;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [detectorReady, enabled, videoRef]);

  return { ...result, detectorReady, error };
}
