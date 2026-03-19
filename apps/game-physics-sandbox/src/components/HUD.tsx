import { useT } from '@motion-games/engine';
import { useGameStore } from '../store/useGameStore';
import texts from '../i18n';

export function HUD() {
  const { t } = useT(texts);
  const score = useGameStore((s) => s.score);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const towerLevel = useGameStore((s) => s.towerLevel);
  const blocksToppled = useGameStore((s) => s.blocksToppled);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.ceil(timeLeft % 60);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const urgent = timeLeft <= 10;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'calc(10px + env(safe-area-inset-top, 0px)) calc(20px + env(safe-area-inset-right, 0px)) 10px calc(20px + env(safe-area-inset-left, 0px))',
      zIndex: 50, pointerEvents: 'none',
      fontFamily: "'Segoe UI', sans-serif",
      color: '#fff',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: '6px 16px',
        fontSize: 18, fontWeight: 700,
      }}>
        🏆 {score}
      </div>
      <div style={{
        background: urgent ? 'rgba(255,60,60,0.7)' : 'rgba(0,0,0,0.4)',
        borderRadius: 16, padding: '6px 16px',
        fontSize: 18, fontWeight: 700,
        animation: urgent ? 'pulse 0.5s ease-in-out infinite alternate' : undefined,
      }}>
        ⏱️ {timeStr}
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: '6px 16px',
        fontSize: 14, fontWeight: 600,
      }}>
        🧱 {t('towerLv')}{towerLevel} | {t('toppled')} {blocksToppled}
      </div>
      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
