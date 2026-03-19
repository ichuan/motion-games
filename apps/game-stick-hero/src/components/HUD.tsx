import { useT } from '@motion-games/engine';
import { useGameStore } from '../store/useGameStore';
import texts from '../i18n';

export function HUD() {
  const { t } = useT(texts);
  const score = useGameStore((s) => s.score);
  const bestScore = useGameStore((s) => s.bestScore);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between',
      padding: 'calc(12px + env(safe-area-inset-top, 0px)) calc(20px + env(safe-area-inset-right, 0px)) 12px calc(20px + env(safe-area-inset-left, 0px))',
      zIndex: 50, pointerEvents: 'none',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 900, color: '#fff',
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}>
        {score}
      </div>
      {bestScore > 0 && (
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          {t('bestScore')}: {bestScore}
        </div>
      )}
    </div>
  );
}
