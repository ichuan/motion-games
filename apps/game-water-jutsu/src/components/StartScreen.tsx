import texts from '../i18n';

const t = texts;
const lang: 'zh' | 'en' = navigator.language.startsWith('zh') ? 'zh' : 'en';

interface Props {
  onStart: () => void;
}

export function StartScreen({ onStart }: Props) {
  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.emoji}>💧🥷</div>
        <h1 style={styles.title}>{t.title[lang]}</h1>
        <p style={styles.subtitle}>{t.subtitle[lang]}</p>
        <div style={styles.instructions}>
          <p>{t.inst1[lang]}</p>
          <p>{t.inst2[lang]}</p>
        </div>
        <button style={styles.btn} onClick={onStart}>
          {lang === 'zh' ? '开始修炼！' : 'Start!'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:        'absolute',
    inset:           0,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      'rgba(0,0,0,0.72)',
    zIndex:          20,
  },
  card: {
    background:      'rgba(0,10,30,0.92)',
    border:          '2px solid rgba(0,160,255,0.45)',
    borderRadius:    20,
    padding:         '36px 44px',
    textAlign:       'center',
    maxWidth:        400,
    width:           '90%',
    boxShadow:       '0 0 40px rgba(0,120,255,0.35)',
    backdropFilter:  'blur(12px)',
  },
  emoji: {
    fontSize:    52,
    marginBottom: 12,
  },
  title: {
    fontSize:    34,
    fontWeight:  900,
    color:       '#00CCFF',
    marginBottom: 6,
    textShadow:  '0 0 16px rgba(0,200,255,0.7)',
  },
  subtitle: {
    fontSize:    16,
    color:       '#88CCEE',
    marginBottom: 22,
  },
  instructions: {
    fontSize:    14,
    color:       '#AADDEE',
    lineHeight:  1.7,
    marginBottom: 28,
    padding:     '14px 18px',
    background:  'rgba(0,80,160,0.25)',
    borderRadius: 10,
    border:      '1px solid rgba(0,140,240,0.2)',
  },
  btn: {
    padding:         '14px 40px',
    fontSize:        20,
    fontWeight:      800,
    borderRadius:    40,
    border:          'none',
    cursor:          'pointer',
    background:      'linear-gradient(135deg, #0066CC, #00AAFF)',
    color:           '#FFFFFF',
    boxShadow:       '0 4px 24px rgba(0,150,255,0.6)',
    transition:      'transform 0.12s, box-shadow 0.12s',
    letterSpacing:   1,
  },
};
