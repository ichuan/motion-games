import { useEffect, useState } from 'react';
import { COUNTDOWN_SECONDS } from '../game/constants';

interface Props {
  onComplete: () => void;
}

export function CountdownOverlay({ onComplete }: Props) {
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 200, pointerEvents: 'none',
    }}>
      <div
        key={count}
        style={{
          fontSize: 120, fontWeight: 900, color: '#fff',
          textShadow: '0 4px 30px rgba(0,0,0,0.4)',
          animation: 'countdown-pop 0.6s ease-out',
        }}
      >
        {count > 0 ? count : 'GO!'}
      </div>
      <style>{`
        @keyframes countdown-pop {
          0% { transform: scale(2); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
