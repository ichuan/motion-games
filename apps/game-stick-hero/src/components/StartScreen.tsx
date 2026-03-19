import { useCallback, useRef } from 'react';

interface Props {
  loading: boolean;
  error: string | null;
  onStart: () => void;
}

export function StartScreen({ loading, error, onStart }: Props) {
  const didFullscreen = useRef(false);

  const handleTap = useCallback(() => {
    if (!didFullscreen.current) {
      didFullscreen.current = true;
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        color: '#fff',
      }}
    >
      {/* Left: title + instructions */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, flex: 1, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 48 }}>🌉</span>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>棍子英雄</h1>
            <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Stick Hero</p>
          </div>
        </div>

        <div style={{
          padding: '10px 20px', borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', textAlign: 'center',
          lineHeight: 1.6, fontSize: 14,
        }}>
          <div>😮 张嘴 → 木棍生长</div>
          <div>😶 闭嘴 → 木棍倒下搭桥</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>
            也可以按住屏幕代替张嘴
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>
            📱 横屏游玩效果更佳
          </div>
        </div>
      </div>

      {/* Right: button + link */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, flex: 1, padding: 20,
      }}>
        {error && (
          <div style={{
            color: '#FF5252', fontSize: 13, maxWidth: 260, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          disabled={loading}
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          style={{
            padding: '12px 44px', borderRadius: 30,
            border: 'none', fontSize: 17, fontWeight: 700, cursor: 'pointer',
            background: loading ? '#555' : '#e74c3c',
            color: '#fff', transition: 'transform 0.1s',
          }}
        >
          {loading ? '加载中...' : '开始游戏'}
        </button>

        <a
          href="/"
          style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 12,
            textDecoration: 'none',
          }}
        >
          返回大厅
        </a>
      </div>
    </div>
  );
}
