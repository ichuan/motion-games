# Motion Games

基于摄像头的体感交互游戏合集。无需外设，打开浏览器即可游玩。

**在线体验**: https://games.981234.xyz

## 游戏列表

| 游戏 | 状态 | 交互方式 |
|------|------|---------|
| 🎈 [气球捏捏乐](https://games.981234.xyz/balloon-popper/) | 已上线 | 手势追踪 — 捏合手指戳破气球 |
| 🏍️ 咆哮摩托 | 开发中 | 头部倾斜转向 + 麦克风音量加速 |
| 🧲 魔法物理沙盒 | 计划中 | 手势抛投 + Rapier2D 物理 |

## 项目结构

```
motion-games/
├── packages/motion-engine   # 共享引擎：摄像头、手势追踪、滤波、音效
├── apps/hub                 # 游戏大厅（静态页）
├── apps/game-balloon-popper # 气球捏捏乐
└── scripts/deploy.sh        # 构建 + rsync 部署
```

## 技术栈

- **手势识别**: TensorFlow.js + hand-pose-detection
- **渲染**: PixiJS 8 + @pixi/react
- **UI**: React 19 + Zustand
- **音效**: Howler.js (Web Audio API)
- **构建**: Vite 6 + pnpm workspace

## 本地开发

```bash
pnpm install
pnpm dev:balloon   # 启动气球捏捏乐开发服务器
```

需要 HTTPS 或 localhost 才能访问摄像头。

## 部署

```bash
pnpm deploy        # 构建 + rsync 到 games.981234.xyz
```
