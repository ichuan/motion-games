import { forwardRef } from 'react';

export const CameraPreview = forwardRef<HTMLVideoElement>(function CameraPreview(_, ref) {
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        width: 160,
        height: 120,
        borderRadius: 12,
        objectFit: 'cover',
        transform: 'scaleX(-1)',
        opacity: 0.6,
        border: '2px solid rgba(255,255,255,0.3)',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    />
  );
});
