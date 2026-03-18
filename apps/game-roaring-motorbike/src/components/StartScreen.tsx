interface Props {
  loading: boolean;
  error: string | null;
  onStart: () => void;
}

export function StartScreen({ loading, error, onStart }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #FF6F00 0%, #E65100 100%)',
      zIndex: 200, color: '#fff', textAlign: 'center',
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🏍️</div>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px' }}>
        咆哮摩托
      </h1>
      <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 16 }}>
        Roaring Motorbike
      </p>
      <div style={{
        fontSize: 14, opacity: 0.9, marginBottom: 24, maxWidth: 280, lineHeight: 1.6,
        background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 16px',
      }}>
        <div>🎤 对着手机发出声音 → 加速</div>
        <div>📱 左右歪头 → 转向</div>
      </div>
      {error ? (
        <div style={{
          background: 'rgba(255,0,0,0.2)', borderRadius: 12,
          padding: '12px 24px', maxWidth: 300,
        }}>
          {error}
        </div>
      ) : (
        <button
          disabled={loading}
          onClick={onStart}
          style={{
            background: loading ? 'rgba(255,255,255,0.2)' : '#fff',
            color: loading ? '#fff' : '#E65100',
            border: 'none', borderRadius: 28, padding: '14px 48px',
            fontSize: 20, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: 'transform 0.15s',
          }}
          onPointerDown={(e) => { if (!loading) (e.target as HTMLElement).style.transform = 'scale(0.95)'; }}
          onPointerUp={(e) => { (e.target as HTMLElement).style.transform = ''; }}
        >
          {loading ? '加载模型中...' : '开始游戏'}
        </button>
      )}
      {loading && (
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 16 }}>
          首次加载可能需要几秒...
        </p>
      )}
    </div>
  );
}
