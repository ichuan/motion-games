import { useEffect } from 'react';
import { SFX, useT } from '@motion-games/engine';
import { useGameStore } from '../store/useGameStore';
import texts from '../i18n';

interface Props {
  onRestart: () => void;
}

export function ResultScreen({ onRestart }: Props) {
  const { t } = useT(texts);
  const score = useGameStore((s) => s.score);
  const popped = useGameStore((s) => s.popped);
  const missed = useGameStore((s) => s.missed);
  const bestCombo = useGameStore((s) => s.bestCombo);

  const emoji = score >= 200 ? '🏆' : score >= 100 ? '🎉' : '👍';

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
        {t('gameOver')}
      </h2>
      <div style={{
        background: 'rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '20px 40px', display: 'grid', gap: 12,
        gridTemplateColumns: '1fr 1fr', fontSize: 18,
      }}>
        <div style={{ opacity: 0.7 }}>{t('score')}</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>{score}</div>
        <div style={{ opacity: 0.7 }}>{t('popped')}</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>{popped}{t('unit')}</div>
        <div style={{ opacity: 0.7 }}>{t('missed')}</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>{missed}{t('unit')}</div>
        <div style={{ opacity: 0.7 }}>{t('bestCombo')}</div>
        <div style={{ fontWeight: 700, textAlign: 'right' }}>x{bestCombo}</div>
      </div>
      <button
        onClick={onRestart}
        style={{
          marginTop: 32, background: '#fff', color: '#764ba2',
          border: 'none', borderRadius: 28, padding: '14px 48px',
          fontSize: 20, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {t('playAgain')}
      </button>
      <a
        href="/"
        style={{
          marginTop: 16, color: 'rgba(255,255,255,0.6)',
          fontSize: 16, textDecoration: 'none',
        }}
      >
        {t('backToHub')}
      </a>
    </div>
  );
}
