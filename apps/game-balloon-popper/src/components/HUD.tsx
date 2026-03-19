import { useGameStore } from '../store/useGameStore';

export function HUD() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const timeLeft = useGameStore((s) => s.timeLeft);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'calc(12px + env(safe-area-inset-top, 0px)) calc(20px + env(safe-area-inset-right, 0px)) 12px calc(20px + env(safe-area-inset-left, 0px))',
      color: '#fff', fontWeight: 700, fontSize: 22,
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      zIndex: 50, pointerEvents: 'none',
    }}>
      <div style={{ minWidth: 100 }}>
        {combo >= 3 && (
          <span style={{ color: '#FFD54F', fontSize: 18, marginRight: 8 }}>
            x{combo}
          </span>
        )}
        {score}
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.3)', borderRadius: 20,
        padding: '4px 16px', fontSize: 20,
      }}>
        {Math.ceil(timeLeft)}s
      </div>
    </div>
  );
}
