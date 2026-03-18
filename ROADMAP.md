## 📥 Inbox
- [ ] 考虑后续增加 Pose Landmarker 支持，以适应更远距离的全身互动（因游戏而异）。
- [ ] 调研极简的本地局域网（P2P） WebRTC 连接推流方案（未来的手机+电视方案）。

## 🟢 Doing (Max 2-3)
（无）

## 🟡 Next Up
- [ ] 咆哮摩托 (Roaring Motorbike) 游戏开发：头部倾斜转向 + 麦克风音量加速
- [ ] motion-engine 增加 face-landmarks-detection 支持（咆哮摩托前置）
- [ ] 游标系统从 balloon-popper 抽象到 motion-engine（跨游戏复用）
- [ ] 魔法物理沙盒 (Magic Physics Sandbox)：Rapier2D 物理 + 手势抛投

## ⚪ Backlog
- [ ] 手机做 Sensor、电视做 Display 的跨网段配对架构 (Phase 2)

## 📔 Done
> 最近完成（查看完整历史 → [CHANGELOG.md](CHANGELOG.md)）
- [x] 横屏锁定 + 全屏 API + Service Worker 模型缓存 - 2026-03-18
- [x] 游戏大厅 Hub + 部署流水线 (Vite build + rsync + Caddy) - 2026-03-18
- [x] Howler.js 音效系统 (pop/bomb/combo/countdown/start/result) - 2026-03-18
- [x] 气球捏捏乐 (Balloon Popper) MVP 完成并上线 - 2026-03-18
- [x] motion-engine 核心：摄像头、手部追踪、捏合检测、EMA 滤波 - 2026-03-18
