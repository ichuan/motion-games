import { useCallback, useRef } from 'react';
import { useT } from '@motion-games/engine';
import texts from '../i18n';

interface Props {
  loading: boolean;
  error: string | null;
  onStart: () => void;
}

export function StartScreen({ loading, error, onStart }: Props) {
  const { t, locale, switchLocale } = useT(texts);
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
      <button
        onClick={(e) => { e.stopPropagation(); switchLocale(locale === 'zh' ? 'en' : 'zh'); }}
        style={{
          position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: 'calc(16px + env(safe-area-inset-right, 0px))',
          zIndex: 201, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 14, cursor: 'pointer',
        }}
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </button>

      {/* Left: title + instructions */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, flex: 1, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 48 }}>🌉</span>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{t('title')}</h1>
            <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>{t('subtitle')}</p>
          </div>
        </div>

        <div style={{
          padding: '10px 20px', borderRadius: 12,
          background: 'rgba(255,255,255,0.08)', textAlign: 'center',
          lineHeight: 1.6, fontSize: 14,
        }}>
          <div>{t('inst1')}</div>
          <div>{t('inst2')}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>
            {t('touchHint')}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.5 }}>
            {t('landscape')}
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
          {loading ? t('loading') : t('startGame')}
        </button>

        <a
          href="/"
          style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 12,
            textDecoration: 'none',
          }}
        >
          {t('backToHub')}
        </a>
      </div>
    </div>
  );
}
