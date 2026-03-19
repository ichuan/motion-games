import { useEffect, useRef } from 'react';

/**
 * Keep the screen awake using the Screen Wake Lock API.
 * Automatically re-acquires the lock when the page becomes visible again.
 */
export function useWakeLock(enabled = true): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;

    async function acquire() {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake Lock request failed (e.g. low battery, background tab)
      }
    }

    // Re-acquire on page visibility change (lock is auto-released when hidden)
    function onVisibility() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [enabled]);
}
