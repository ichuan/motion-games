import { useGameStore } from '../store/useGameStore';
import texts from '../i18n';

const lang: 'zh' | 'en' = navigator.language.startsWith('zh') ? 'zh' : 'en';
const t = texts;

interface Props {
  onRestart: () => void;
}

export function ResultScreen({ onRestart }: Props) {
  const score     = useGameStore((s) => s.score);
  const hits      = useGameStore((s) => s.hits);
  const missed    = useGameStore((s) => s.missed);
  const bestCombo = useGameStore((s) => s.bestCombo);

  const rows = [
    { label: t.score[lang],     value: score },
    { label: t.hit[lang],       value: `${hits}${t.unit[lang]}` },
    { label: t.missed[lang],    value: `${missed}${t.unit[lang]}` },
    { label: t.bestCombo[lang], value: `${bestCombo}×` },
  ];

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h2 style={styles.title}>{t.gameOver[lang]}</h2>

        <div style={styles.statsGrid}>
          {rows.map(({ label, value }) => (
            <div key={label} style={styles.statRow}>
              <span style={styles.statLabel}>{label}</span>
              <span style={styles.statValue}>{value}</span>
            </div>
          ))}
        </div>

        <button style={styles.btn} onClick={onRestart}>
          {t.playAgain[lang]}
        </button>
        <a href="/" style={styles.backLink}>{t.backToHub[lang]}</a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'rgba(0,0,0,0.72)',
    zIndex:         30,
  },
  card: {
    background:     'rgba(0,10,30,0.95)',
    border:         '2px solid rgba(0,160,255,0.4)',
    borderRadius:   20,
    padding:        '36px 44px',
    textAlign:      'center',
    minWidth:       320,
    maxWidth:       400,
    width:          '90%',
    boxShadow:      '0 0 40px rgba(0,120,255,0.3)',
  },
  title: {
    fontSize:    32,
    fontWeight:  900,
    color:       '#00CCFF',
    marginBottom: 24,
    textShadow:  '0 0 16px rgba(0,200,255,0.6)',
  },
  statsGrid: {
    display:        'flex',
    flexDirection:  'column',
    gap:            10,
    marginBottom:   28,
  },
  statRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '8px 16px',
    background:     'rgba(0,80,160,0.2)',
    borderRadius:   8,
    border:         '1px solid rgba(0,140,240,0.15)',
  },
  statLabel: {
    fontSize: 15,
    color:    '#88BBCC',
  },
  statValue: {
    fontSize:   20,
    fontWeight: 800,
    color:      '#FFFFFF',
  },
  btn: {
    display:         'block',
    width:           '100%',
    padding:         '14px 0',
    fontSize:        20,
    fontWeight:      800,
    borderRadius:    40,
    border:          'none',
    cursor:          'pointer',
    background:      'linear-gradient(135deg, #0066CC, #00AAFF)',
    color:           '#FFFFFF',
    marginBottom:    14,
    boxShadow:       '0 4px 24px rgba(0,150,255,0.6)',
    letterSpacing:   1,
  },
  backLink: {
    fontSize:     14,
    color:        '#5599BB',
    textDecoration: 'none',
  },
};
