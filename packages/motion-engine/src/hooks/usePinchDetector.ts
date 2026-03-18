import { useEffect, useRef, useMemo } from 'react';
import { PinchDetector } from '../input/pinch-detector';
import type { SmoothedHand } from '../tracking/types';
import type { PinchState, PinchEvent } from '../input/types';

export function usePinchDetector(
  hand: SmoothedHand | null,
  videoWidth: number,
  onPinchStart?: (e: PinchEvent) => void,
  onPinchEnd?: (e: PinchEvent) => void,
): PinchState {
  const detector = useMemo(() => new PinchDetector(), []);
  const stateRef = useRef<PinchState>({ isPinching: false, pinchPoint: null });
  const onPinchStartRef = useRef(onPinchStart);
  const onPinchEndRef = useRef(onPinchEnd);
  onPinchStartRef.current = onPinchStart;
  onPinchEndRef.current = onPinchEnd;

  useEffect(() => {
    if (!hand) {
      detector.reset();
      stateRef.current = { isPinching: false, pinchPoint: null };
      return;
    }

    const state = detector.update(hand.thumbTip, hand.indexTip, videoWidth);
    stateRef.current = state;

    for (const event of detector.drainEvents()) {
      if (event.type === 'pinchstart') onPinchStartRef.current?.(event);
      else onPinchEndRef.current?.(event);
    }
  });

  return stateRef.current;
}
