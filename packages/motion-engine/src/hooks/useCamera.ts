import { useEffect, useRef, useState } from 'react';
import { createCamera } from '../tracking/camera';
import { getLocale } from '../i18n/lang';
import { common } from '../i18n/locales';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await createCamera();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setIsReady(true);
        }
      } catch (e) {
        if (!cancelled) setError(common.cameraError[getLocale()]);
      }
    }

    init();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, isReady, error };
}
