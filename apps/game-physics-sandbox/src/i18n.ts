const texts = {
  title:        { zh: '魔法物理沙盒', en: 'Physics Sandbox' },
  subtitle:     { zh: 'Physics Sandbox', en: 'Topple the towers!' },
  inst1:        { zh: '👌 捏合手指 → 抓取物体', en: '👌 Pinch fingers → grab objects' },
  inst2:        { zh: '🤚 挥手抛出 → 推倒积木塔', en: '🤚 Swing to throw → topple towers' },
  inst3:        { zh: '⏱️ 60 秒内推倒尽可能多的积木！', en: '⏱️ Topple as many blocks as you can in 60s!' },
  timeUp:       { zh: '时间到！', en: "Time's up!" },
  totalScore:   { zh: '总分', en: 'Score' },
  blocksLabel:  { zh: '推倒积木', en: 'Toppled' },
  towersLabel:  { zh: '通关塔数', en: 'Towers' },
  towerLv:      { zh: '塔 Lv.', en: 'Tower Lv.' },
  toppled:      { zh: '倒', en: 'Down' },
  fullClear:    { zh: '全清', en: 'Clear' },
} as const;
export default texts;
