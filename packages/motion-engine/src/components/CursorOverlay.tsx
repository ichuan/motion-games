import { useEffect, useRef } from 'react';
import type { CursorState } from '../cursor/types';

export function CursorOverlay({ cursorRef }: { cursorRef: React.RefObject<CursorState> }) {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let running = true;
    let lerpX = 0, lerpY = 0;
    const LERP = 0.35;

    function loop() {
      if (!running) return;
      const ring = ringRef.current;
      const c = cursorRef.current;
      if (ring && c) {
        if (c.visible && c.x > 0 && c.y > 0) {
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
