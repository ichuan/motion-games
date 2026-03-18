import { useEffect, useRef, useState } from 'react';
import { createFaceDetector, type FaceDetector } from '../tracking/face-detector';
import { EMAFilter } from '../filter/ema';
import type { FaceTrackingResult } from '../tracking/types';

// Eye corner landmark indices for tilt calculation
const RIGHT_EYE_OUTER = 33;
const LEFT_EYE_OUTER = 263;

// Fixed canvas size — always landscape, same pattern as hand tracking
const MODEL_W = 640;
const MODEL_H = 480;

// Only smooth the 2 eye corner points we need
const NUM_FILTERED_POINTS = 2;

export function useFaceTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true,
): FaceTrackingResult & { detectorReady: boolean; error: string | null } {
  const [result, setResult] = useState<FaceTrackingResult>({ tiltAngle: null, isTracking: false });
  const [detectorReady, setDetectorReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const filtersRef = useRef<EMAFilter[]>([]);
  const busyRef = useRef(false);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const canvas = document.createElement('canvas');
    canvas.width = MODEL_W;
    canvas.height = MODEL_H;
    canvasRef.current = canvas;

    async function init() {
      try {
        const detector = await createFaceDetector();
        if (cancelled) { detector.dispose(); return; }
        detectorRef.current = detector;
        // 2 filters: right eye outer, left eye outer
        filtersRef.current = Array.from({ length: NUM_FILTERED_POINTS }, () => new EMAFilter(0.3));

        // Warm up with 3 dummy frames
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, MODEL_W, MODEL_H);
          for (let i = 0; i < 3; i++) {
            await detector.estimateFaces(canvas);
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

        const ctx = canvas.getContext('2d')!;
        // Mirror horizontally (front camera)
        ctx.save();
        ctx.translate(MODEL_W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, MODEL_W, MODEL_H);
        ctx.restore();

        detector.estimateFaces(canvas).then((faces) => {
          busyRef.current = false;
          if (faces.length === 0) {
            setResult({ tiltAngle: null, isTracking: false });
            return;
          }

          const kps = faces[0].keypoints;
          if (!kps || kps.length < 300) {
            setResult({ tiltAngle: null, isTracking: false });
            return;
          }

          const filters = filtersRef.current;

          // Extract and smooth the two eye corner points
          const rawRight = kps[RIGHT_EYE_OUTER];
          const rawLeft = kps[LEFT_EYE_OUTER];

          if (
            !Number.isFinite(rawRight?.x) || !Number.isFinite(rawRight?.y) ||
            !Number.isFinite(rawLeft?.x) || !Number.isFinite(rawLeft?.y)
          ) {
            return;
          }

          const rightEye = filters[0].update(rawRight.x, rawRight.y);
          const leftEye = filters[1].update(rawLeft.x, rawLeft.y);

          // tiltAngle: positive = head tilted right (clockwise)
          const tiltAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

          setResult({ tiltAngle, isTracking: true });
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
