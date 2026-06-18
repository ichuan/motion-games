import { useEffect, useRef, useState } from 'react';
import { createCamera } from '../tracking/camera';
import { getLocale } from '../i18n/lang';
import { common } from '../i18n/locales';

export function useCamera(enabled = true, constraints?: MediaStreamConstraints) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function stopCamera() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    if (!enabled) {
      setIsReady(false);
      setError(null);
      stopCamera();
      return;
    }

    let cancelled = false;
    setIsReady(false);
    setError(null);

    async function init() {
      try {
        const stream = await createCamera(constraints);
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
      stopCamera();
    };
  }, [enabled, constraints]);

  return { videoRef, isReady, error };
}
