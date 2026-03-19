import { SFX } from '@motion-games/engine';
import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

interface Props {
  onRestart: () => void;
}

export function ResultScreen({ onRestart }: Props) {
  const score = useGameStore((s) => s.score);
  const bestScore = useGameStore((s) => s.bestScore);
  const perfectCount = useGameStore((s) => s.perfectCount);

  useEffect(() => { SFX.result(); }, []);

  const emoji = score >= 20 ? '🏆' : score >= 10 ? '🌟' : score >= 5 ? '👍' : '💪';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      color: '#fff', gap: 16,
    }}>
      <div style={{ fontSize: 64 }}>{emoji}</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>游戏结束</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '12px 32px', marginTop: 16, fontSize: 16,
      }}>
        <div style={{ opacity: 0.6, textAlign: 'right' }}>得分</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{score}</div>

        <div style={{ opacity: 0.6, textAlign: 'right' }}>最高分</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{Math.max(score, bestScore)}</div>

        <div style={{ opacity: 0.6, textAlign: 'right' }}>完美次数</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{perfectCount}</div>
      </div>

      <button
        onClick={onRestart}
        style={{
          marginTop: 24, padding: '14px 48px', borderRadius: 30,
          border: 'none', fontSize: 18, fontWeight: 700, cursor: 'pointer',
          background: '#e74c3c', color: '#fff',
        }}
      >
        再来一局
      </button>

      <a
        href="/"
        style={{
          marginTop: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13,
          textDecoration: 'none',
        }}
      >
        返回大厅
      </a>
    </div>
  );
}
