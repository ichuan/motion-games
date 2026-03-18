import { useEffect, useMemo, useRef } from 'react';
import { useHandTracking } from './useHandTracking';
import { usePinchDetector } from './usePinchDetector';
import type { CursorState } from '../cursor/types';

export function useCursor(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  screenSize: { width: number; height: number },
  enabled = true,
): {
  cursorRef: React.MutableRefObject<CursorState>;
  detectorReady: boolean;
  hasHand: boolean;
  error: string | null;
} {
  const cursorRef = useRef<CursorState>({ x: 0, y: 0, isPinching: false, visible: false });

  const { hand, detectorReady, error } = useHandTracking(videoRef, enabled);

  const pinchState = usePinchDetector(
    hand,
    videoRef.current?.videoWidth || 640,
  );

  const hasHand = !!hand;
  const visible = hasHand && enabled;

  if (hand) {
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    const cx = (hand.indexTip.x / vw) * screenSize.width;
    const cy = (hand.indexTip.y / vh) * screenSize.height;
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      cursorRef.current = {
        x: cx, y: cy,
        isPinching: pinchState.isPinching,
        visible,
      };
    }
  } else {
    cursorRef.current = { ...cursorRef.current, visible };
  }

  return { cursorRef, detectorReady, hasHand, error };
}
