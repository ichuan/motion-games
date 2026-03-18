## 📥 Inbox
- [ ] 考虑后续增加 Pose Landmarker 支持，以适应更远距离的全身互动（因游戏而异）。
- [ ] 调研极简的本地局域网（P2P） WebRTC 连接推流方案（未来的手机+电视方案）。

## 🟢 Doing (Max 2-3)
- [x] 初始化 Monorepo 架构 (pnpm + Vite)
- [x] 搭建 `packages/motion-engine` 核心多点追踪 (TensorFlow.js) 与物理演算 (Rapier2D) 脚手架

## 🟡 Next Up
- [ ] 实现 MVP 游戏 1：魔法物理沙盒 (Magic Physics Sandbox) - 确保画风可爱精美
- [ ] 设计通用的 WebRTC 视频流获取与 TensorFlow.js 手势追踪生命周期管理 Hook
- [ ] 实现前端动态游标（Dynamic Reticle/Cursor）系统
- [ ] 集成 Howler.js 音效系统（Audio Sprite 方案）

## ⚪ Backlog
- [ ] 咆哮摩托 (Roaring Motorbike) 游戏开发：结合头部倾斜转向与麦克风音量加速的派对游戏
- [ ] 气球捏捏乐 (Balloon Popper) 游戏开发
- [ ] 相机视口坐标空间相对屏幕物理映射算法调优
- [ ] 手机做为 Sensor、电视做为 Display 的跨网段配对架构设计 (Phase 2)

## 📔 Done
> 最近完成（查看完整历史 → [CHANGELOG.md](CHANGELOG.md)）
