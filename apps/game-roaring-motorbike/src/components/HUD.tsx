import { useGameStore } from '../store/useGameStore';

interface Props {
  speed: number;  // 0-1 normalized
  volume: number; // 0-1 mic volume
  hasMic: boolean;
}

export function HUD({ speed, volume, hasMic }: Props) {
  const distance = useGameStore((s) => s.distance);
  const coins = useGameStore((s) => s.coins);
  const timeLeft = useGameStore((s) => s.timeLeft);

  return (
    <>
      {/* Top bar: distance + time */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px',
        color: '#fff', fontWeight: 700, fontSize: 20,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        zIndex: 50, pointerEvents: 'none',
      }}>
        <div>
          {Math.floor(distance)}m
          {coins > 0 && (
            <span style={{ color: '#FFD54F', fontSize: 16, marginLeft: 12 }}>
              🪙 {coins}
            </span>
          )}
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.3)', borderRadius: 20,
          padding: '4px 16px', fontSize: 18,
        }}>
          {Math.ceil(timeLeft)}s
        </div>
      </div>

      {/* Speed indicator — right side vertical bar */}
      <div style={{
        position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)',
        width: 8, height: 120, borderRadius: 4,
        background: 'rgba(255,255,255,0.15)',
        zIndex: 50, pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${speed * 100}%`, borderRadius: 4,
          background: speed > 0.7 ? '#FF5722' : speed > 0.3 ? '#FFC107' : '#4CAF50',
          transition: 'height 0.1s, background 0.3s',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, color: '#fff', opacity: 0.6, whiteSpace: 'nowrap',
        }}>
          {Math.floor(speed * 100)}
        </div>
      </div>

      {/* Mic volume indicator — left side */}
      {hasMic && (
        <div style={{
          position: 'fixed', left: 12, top: '50%', transform: 'translateY(-50%)',
          width: 8, height: 120, borderRadius: 4,
          background: 'rgba(255,255,255,0.15)',
          zIndex: 50, pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${Math.min(volume * 300, 100)}%`, borderRadius: 4,
            background: '#4FC3F7',
            transition: 'height 0.05s',
          }} />
          <div style={{
            position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10, color: '#fff', opacity: 0.6,
          }}>
            🎤
          </div>
        </div>
      )}
    </>
  );
}
