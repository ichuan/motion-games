# Motion Games

基于摄像头的体感交互游戏合集。无需外设，打开浏览器即可游玩。支持中英双语。

**在线体验**: https://games.981234.xyz

## 游戏列表

| 游戏 | 交互方式 |
|------|---------|
| 🎈 [气球捏捏乐](https://games.981234.xyz/balloon-popper/) | 手势追踪 — 捏合手指戳破气球 |
| 🌉 [棍子英雄](https://games.981234.xyz/stick-hero/) | 面部追踪 — 张嘴/闭嘴控制木棍生长搭桥 |
| 🏍️ [咆哮摩托](https://games.981234.xyz/roaring-motorbike/) | 头部倾斜转向 + 麦克风音量加速 |
| 🧱 [魔法物理沙盒](https://games.981234.xyz/physics-sandbox/) | 手势抛投 + Rapier2D 物理引擎 |

## 项目结构

```
motion-games/
├── packages/motion-engine       # 共享引擎：摄像头、手势/面部追踪、滤波、音效、i18n
├── apps/hub                     # 游戏大厅（静态页 + PWA）
├── apps/game-balloon-popper     # 气球捏捏乐
├── apps/game-stick-hero         # 棍子英雄
├── apps/game-roaring-motorbike  # 咆哮摩托
├── apps/game-physics-sandbox    # 魔法物理沙盒
└── scripts/deploy.sh            # 构建 + rsync 部署
```

## 技术栈

- **手势识别**: TensorFlow.js + hand-pose-detection
- **面部追踪**: TensorFlow.js + face-landmarks-detection (MediaPipe Face Mesh)
- **渲染**: PixiJS 8 + @pixi/react
- **物理**: Rapier2D WASM
- **UI**: React 19 + Zustand
- **音效**: Howler.js (Web Audio API)
- **构建**: Vite 6 + pnpm workspace
- **国际化**: 自研极简 i18n（useT hook + localStorage）

## 本地开发

```bash
pnpm install
pnpm dev:balloon    # 气球捏捏乐
pnpm dev:stick      # 棍子英雄
pnpm dev:motorbike  # 咆哮摩托
pnpm dev:sandbox    # 魔法物理沙盒
```

需要 HTTPS 或 localhost 才能访问摄像头。

## 部署

```bash
bash scripts/deploy.sh   # 构建所有游戏 + rsync 到 games.981234.xyz
```
