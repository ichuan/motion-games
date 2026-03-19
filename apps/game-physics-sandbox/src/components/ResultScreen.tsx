import { useGameStore } from '../store/useGameStore';

interface Props {
  onRestart: () => void;
}

export function ResultScreen({ onRestart }: Props) {
  const score = useGameStore((s) => s.score);
  const blocksToppled = useGameStore((s) => s.blocksToppled);
  const towersCleared = useGameStore((s) => s.towersCleared);

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      zIndex: 200, color: '#fff', textAlign: 'center',
      padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 24px' }}>
        时间到！
      </h2>

      <div style={{
        display: 'flex', gap: 24, marginBottom: 32,
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <StatBox label="总分" value={`${score}`} icon="🏆" />
        <StatBox label="推倒积木" value={`${blocksToppled}`} icon="🧱" />
        <StatBox label="通关塔数" value={`${towersCleared}`} icon="🏰" />
      </div>

      <button
        onClick={onRestart}
        style={{
          background: '#fff', color: '#3949AB',
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
          color: 'rgba(255,255,255,0.4)', fontSize: 12,
          textDecoration: 'none', marginTop: 16,
        }}
      >
        返回大厅
      </a>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)', borderRadius: 16,
      padding: '16px 24px', minWidth: 100,
    }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: 14, opacity: 0.7 }}>{label}</div>
    </div>
  );
}
