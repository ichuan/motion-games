import { useEffect } from 'react';
import { SFX } from '@motion-games/engine';
import { useGameStore } from '../store/useGameStore';

interface Props {
  onRestart: () => void;
}

export function ResultScreen({ onRestart }: Props) {
  const distance = useGameStore((s) => s.distance);
  const coins = useGameStore((s) => s.coins);
  const topSpeed = useGameStore((s) => s.topSpeed);

  const emoji = distance >= 3000 ? '🏆' : distance >= 1500 ? '🎉' : '👍';

  useEffect(() => { SFX.result(); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      zIndex: 200, color: '#fff',
      padding: 'env(safe-area-inset-top, 12px) 20px env(safe-area-inset-bottom, 12px)',
      overflowY: 'auto',
    }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>{emoji}</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 24px' }}>
        骑行结束！
      </h2>
      <div style={{
        background: 'rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '20px 40px', display: 'grid', gap: 12,
        gridTemplateColumns: '1fr 1fr', fontSize: 18,
      }}>
        <div style={{ opacity: 0.7 }}>距离</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>{Math.floor(distance)}m</div>
        <div style={{ opacity: 0.7 }}>金币</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>{coins}个</div>
        <div style={{ opacity: 0.7 }}>最高速度</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>{Math.floor(topSpeed)}</div>
      </div>
      <button
        onClick={onRestart}
        style={{
          marginTop: 32, background: '#fff', color: '#E65100',
          border: 'none', borderRadius: 28, padding: '14px 48px',
          fontSize: 20, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        再来一局
      </button>
      <a
        href="/"
        style={{
          marginTop: 16, color: 'rgba(255,255,255,0.6)',
          fontSize: 16, textDecoration: 'none',
        }}
      >
        返回大厅
      </a>
    </div>
  );
}
