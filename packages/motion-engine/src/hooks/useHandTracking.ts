import { useEffect, useRef, useState } from 'react';
import { createHandDetector, type HandDetector } from '../tracking/hand-detector';
import { EMAFilter } from '../filter/ema';
import type { SmoothedHand, TrackingResult } from '../tracking/types';

const NUM_LANDMARKS = 21;

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true,
): TrackingResult & { detectorReady: boolean } {
  const [result, setResult] = useState<TrackingResult>({ hand: null, isTracking: false });
  const [detectorReady, setDetectorReady] = useState(false);
  const detectorRef = useRef<HandDetector | null>(null);
  const filtersRef = useRef<EMAFilter[]>([]);
  const busyRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function init() {
      const detector = await createHandDetector();
      if (cancelled) { detector.dispose(); return; }
      detectorRef.current = detector;
      filtersRef.current = Array.from({ length: NUM_LANDMARKS }, () => new EMAFilter(0.4));
      setDetectorReady(true);

      // warm up: 3 dummy frames
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        for (let i = 0; i < 3; i++) {
          await detector.estimateHands(video, { flipHorizontal: true });
        }
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
      if (!video || !detector || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!busyRef.current) {
        busyRef.current = true;
        detector.estimateHands(video, { flipHorizontal: true }).then((hands) => {
          busyRef.current = false;
          if (hands.length === 0) {
            setResult({ hand: null, isTracking: false });
            return;
          }

          const raw = hands[0].keypoints;
          const filters = filtersRef.current;
          const smoothed = raw.map((kp, i) => filters[i].update(kp.x, kp.y));

          const hand: SmoothedHand = {
            landmarks: smoothed,
            thumbTip: smoothed[4],
            indexTip: smoothed[8],
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

  return { ...result, detectorReady };
}
