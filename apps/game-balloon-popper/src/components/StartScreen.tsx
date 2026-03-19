import { useT } from '@motion-games/engine';
import texts from '../i18n';

interface Props {
  loading: boolean;
  error: string | null;
  onStart: () => void;
}

export function StartScreen({ loading, error, onStart }: Props) {
  const { t, locale, switchLocale } = useT(texts);

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
      zIndex: 200, color: '#fff', textAlign: 'center',
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <button
        onClick={() => switchLocale(locale === 'zh' ? 'en' : 'zh')}
        style={{
          position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: 'calc(16px + env(safe-area-inset-right, 0px))',
          zIndex: 201, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 14, cursor: 'pointer',
        }}
      >
        {locale === 'zh' ? 'EN' : '中文'}
      </button>

      <div style={{ fontSize: 64, marginBottom: 8 }}>🎈</div>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px' }}>
        {t('title')}
      </h1>
      <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 16 }}>
        {t('subtitle')}
      </p>
      <div style={{
        fontSize: 14, opacity: 0.9, marginBottom: 24, maxWidth: 280, lineHeight: 1.6,
        background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 16px',
      }}>
        <div>{t('inst1')}</div>
        <div>{t('inst2')}</div>
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
            color: loading ? '#fff' : '#764ba2',
            border: 'none', borderRadius: 28, padding: '14px 48px',
            fontSize: 20, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: 'transform 0.15s',
          }}
          onPointerDown={(e) => { if (!loading) (e.target as HTMLElement).style.transform = 'scale(0.95)'; }}
          onPointerUp={(e) => { (e.target as HTMLElement).style.transform = ''; }}
        >
          {loading ? t('loadingModel') : t('startGame')}
        </button>
      )}
      {loading && (
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 16 }}>
          {t('firstLoad')}
        </p>
      )}
      <a
        href="/"
        style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 12,
          textDecoration: 'none', marginTop: 16,
        }}
      >
        {t('backToHub')}
      </a>
    </div>
  );
}
