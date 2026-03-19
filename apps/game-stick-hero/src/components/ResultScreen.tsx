import { SFX, useT } from '@motion-games/engine';
import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import texts from '../i18n';

interface Props {
  onRestart: () => void;
}

export function ResultScreen({ onRestart }: Props) {
  const { t } = useT(texts);
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
      padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
    }}>
      <div style={{ fontSize: 64 }}>{emoji}</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{t('gameOver')}</h2>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '12px 32px', marginTop: 16, fontSize: 16,
      }}>
        <div style={{ opacity: 0.6, textAlign: 'right' }}>{t('score')}</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{score}</div>

        <div style={{ opacity: 0.6, textAlign: 'right' }}>{t('bestScore')}</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{Math.max(score, bestScore)}</div>

        <div style={{ opacity: 0.6, textAlign: 'right' }}>{t('perfectCnt')}</div>
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
        {t('playAgain')}
      </button>

      <a
        href="/"
        style={{
          marginTop: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13,
          textDecoration: 'none',
        }}
      >
        {t('backToHub')}
      </a>
    </div>
  );
}
