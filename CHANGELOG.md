# Project Changelog

## [2026-03-18]
- [x] 横屏锁定 (PortraitLock) + Fullscreen API + `100dvh` + `viewport-fit=cover`
- [x] Service Worker 缓存 TF.js 模型文件（cache-first 策略）
- [x] 游戏大厅 Hub 静态页面 (`apps/hub/index.html`)
- [x] 部署流水线：`scripts/deploy.sh` (pnpm build → rsync → Caddy file_server)
- [x] Howler.js 音效系统：pop, bomb, combo, countdown, start, result
- [x] 气球捏捏乐 (Balloon Popper) MVP 完成并上线 (games.981234.xyz/balloon-popper/)
  - PixiJS 8 + @pixi/react 场景渲染
  - 气球生成、上浮、左右摆动、炸弹气球
  - 碰撞检测（连续检测 + 300ms 冷却）、计分、连击系统
  - 粒子爆散、飘字特效、屏幕震动
  - 游戏状态机：Idle → Countdown → Playing → Result
  - Zustand 状态管理、HUD overlay、结算界面
- [x] motion-engine 核心模块
  - `createCamera()` 摄像头获取
  - `createHandDetector()` TF.js hand-pose-detection
  - `useHandTracking()` — canvas intermediary 方案解决 TF.js 竖屏 NaN bug
  - `EMAFilter` 平滑滤波（含 NaN guard）
  - `PinchDetector` 迟滞状态机
  - HTML overlay 游标 + rAF lerp 插值平滑
- [x] 初始化 Monorepo 架构 (pnpm workspace + Vite)
- [x] 完成核心可行性研究与架构设计选型 (research.md)
