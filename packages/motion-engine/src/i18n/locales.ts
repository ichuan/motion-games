export type Locale = 'zh' | 'en';

/** Common UI strings shared across all games */
export const common = {
  startGame:     { zh: '开始游戏',   en: 'Start Game' },
  loadingModel:  { zh: '加载模型中...', en: 'Loading model...' },
  loading:       { zh: '加载中...',   en: 'Loading...' },
  firstLoad:     { zh: '首次加载可能需要几秒...', en: 'First load may take a few seconds...' },
  backToHub:     { zh: '返回大厅',   en: 'Back to Hub' },
  playAgain:     { zh: '再来一局',   en: 'Play Again' },
  landscapePlz:  { zh: '请横屏使用', en: 'Please use landscape' },
  landscapeDesc: { zh: '将设备旋转为横屏模式以获得最佳游戏体验', en: 'Rotate your device to landscape for the best experience' },
  cameraError:   { zh: '需要摄像头才能游戏，请授权后刷新页面。', en: 'Camera required. Please grant access and refresh.' },
} as const;

export type CommonKey = keyof typeof common;
