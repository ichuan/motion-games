import { useEffect, useRef, useState } from 'react';
import { COUNTDOWN_FROM } from '../game/constants';

interface Props {
  onComplete: () => void;
}

export function CountdownOverlay({ onComplete }: Props) {
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const called = useRef(false);

  useEffect(() => {
    if (count <= 0) {
      if (!called.current) {
        called.current = true;
        onComplete();
      }
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, onComplete]);

  return (
    <div style={styles.root}>
      <span style={styles.digit}>
        {count > 0 ? count : (navigator.language.startsWith('zh') ? '开始！' : 'Go!')}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         25,
    pointerEvents:  'none',
  },
  digit: {
    fontSize:   160,
    fontWeight: 900,
    color:      '#00EEFF',
    textShadow: '0 0 60px rgba(0,200,255,0.9)',
    animation:  'countdownPop 0.25s ease-out',
  },
};
