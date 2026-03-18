import { useEffect, useRef, useState } from 'react';
import { MicVolume } from '../audio/mic-volume';

export function useMicVolume(
  audioStream: MediaStream | null,
): { volume: number; error: string | null } {
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const micRef = useRef<MicVolume | null>(null);
  const rafRef = useRef(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    if (!audioStream) return;

    try {
      const mic = new MicVolume();
      mic.init(audioStream);
      micRef.current = mic;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    const ALPHA = 0.3;

    function tick() {
      const mic = micRef.current;
      if (mic) {
        const raw = mic.getVolume();
        // EMA smoothing
        smoothRef.current = ALPHA * raw + (1 - ALPHA) * smoothRef.current;
        setVolume(smoothRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      micRef.current?.dispose();
      micRef.current = null;
    };
  }, [audioStream]);

  return { volume, error };
}
