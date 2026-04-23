import { useGameStore } from '../store/useGameStore';
import texts from '../i18n';

const lang: 'zh' | 'en' = navigator.language.startsWith('zh') ? 'zh' : 'en';
const t = texts;

export function HUD() {
  const score    = useGameStore((s) => s.score);
  const combo    = useGameStore((s) => s.combo);
  const timeLeft = useGameStore((s) => s.timeLeft);

  return (
    <div style={styles.root}>
      {/* Score - top left */}
      <div style={styles.scoreBlock}>
        <span style={styles.label}>{t.score[lang]}</span>
        <span style={styles.scoreValue}>{score}</span>
      </div>

      {/* Timer - top center */}
      <div style={{ ...styles.timer, color: timeLeft <= 10 ? '#FF4444' : '#00EEFF' }}>
        {Math.ceil(timeLeft)}
      </div>

      {/* Combo - top right */}
      {combo >= 2 && (
        <div style={styles.comboBlock}>
          <span style={styles.comboX}>{combo}×</span>
          <span style={styles.comboLabel}>COMBO</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:  'absolute',
    inset:     0,
    zIndex:    18,
    pointerEvents: 'none',
  },
  scoreBlock: {
    position:    'absolute',
    top:         16,
    left:        20,
    display:     'flex',
    flexDirection: 'column',
    alignItems:  'flex-start',
  },
  label: {
    fontSize:    11,
    color:       '#88BBCC',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize:    36,
    fontWeight:  900,
    color:       '#FFFFFF',
    lineHeight:  1,
    textShadow:  '0 0 12px rgba(0,200,255,0.6)',
  },
  timer: {
    position:    'absolute',
    top:         10,
    left:        '50%',
    transform:   'translateX(-50%)',
    fontSize:    44,
    fontWeight:  900,
    textShadow:  '0 0 16px currentColor',
    lineHeight:  1,
    transition:  'color 0.3s',
  },
  comboBlock: {
    position:    'absolute',
    top:         16,
    right:       20,
    display:     'flex',
    flexDirection: 'column',
    alignItems:  'flex-end',
  },
  comboX: {
    fontSize:    36,
    fontWeight:  900,
    color:       '#FFDD00',
    lineHeight:  1,
    textShadow:  '0 0 14px rgba(255,200,0,0.8)',
  },
  comboLabel: {
    fontSize:    11,
    color:       '#FFBB44',
    letterSpacing: 2,
  },
};
