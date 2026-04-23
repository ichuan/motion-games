# 水遁·击标 (Water Jutsu Striker) — 技术调研与实施计划

**编制日期**：2026-04-23
**状态**：实施中
**灵感来源**：[@DLKFZWilliam2 Twitter 演示](https://x.com/DLKFZWilliam2/status/2046804588351902176) — Three.js + 流体 shader 实现水遁忍术效果

---

## 一、技术原理调研

### 1.1 核心算法：GPU Stable Fluids

William 的水遁效果本质是经典 **Jos Stam Stable Fluids** 算法（NVIDIA GPU Gems Ch.38）的 WebGL 实现。该算法将流体模拟完全跑在 GPU 上，每帧仅需一组 shader pass，无需 CPU 介入物理计算。

**每帧 GPU 流水线（ping-pong 双 FBO 架构）：**

```
splat 注入 (手势速度/染料)
    ↓
curl 计算 (涡量场)
    ↓
vorticity 增强 (让流体产生旋涡感)
    ↓
divergence 散度 (速度场不可压条件前处理)
    ↓
pressure Jacobi 迭代 × 20 (求解压力 Poisson 方程)
    ↓
gradient subtract (投影速度场为无散度场)
    ↓
velocity advection (速度场自推进)
    ↓
dye advection (染料随速度场传播)
    ↓
display (水色渲染 + bloom 输出到画布)
```

**关键数据结构：**
- `velocity`: 双缓冲 RG 纹理 (128²) — 存速度场 (vx, vy)
- `dye`: 双缓冲 RGBA 纹理 (512²) — 存染料颜色 (r, g, b)
- `pressure`: 双缓冲 R 纹理 (128²) — 压力场
- `divergence`: 单 R 纹理 (128²) — 速度散度
- `curl`: 单 R 纹理 (128²) — 涡量场

### 1.2 参考实现

| 项目 | Stars | License | 可用性 |
|------|-------|---------|--------|
| [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | 16.3k | MIT | ✅ 可直接借鉴 shader 源码 |
| haxiomic/GPU-Fluid-Experiments | 3.1k | GPL-3.0 | ⚠️ 仅参考原理 |

### 1.3 "水遁"视觉特效

- **dye 颜色**：青蓝 (#0099EE) → 白色泡沫 (#CCF4FF) — 深蓝到浅白的渐变
- **bloom**：高密度区域额外发光，模拟水面高光反射
- **vorticity**：增强涡量参数 (curl=25-30)，让水流产生自然旋涡，更像真实忍术水遁
- **混合模式**：流体画布用 `mix-blend-mode: screen` 叠加到画面，低密度区透明，高密度区白色水光

---

## 二、可行性评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **技术可行性** | 高 [90%] | GPU Stable Fluids 在 WebGL2 上成熟稳定，iOS 14+ / Android Chrome 均支持 |
| **移动端性能** | 中 [75%] | sim=128² + dye=512² 在中端机约 30-45fps；需自适应降级到 64²/256² |
| **手势→流体集成** | 高 [95%] | 现有 motion-engine 已输出 21 个手关键点，取食指+掌心速度向量即可 |
| **游戏化** | 高 [85%] | A 方案（击标）游戏循环简单清晰，复用 balloon-popper 骨架 |
| **超越 William** | 中 [70%] | 双手协同、声音驱动水墙是明确的进阶方向 |

---

## 三、技术架构

### 3.1 技术栈选型

| 层级 | 技术 | 理由 |
|------|------|------|
| **流体渲染** | Three.js v0.163+ | 相比裸 WebGL 代码量减少 ~40%；长远可扩展 3D 水龙/折射效果 |
| **游戏对象** | PixiJS 8 + @pixi/react | 现有项目标准，复用既有 Sprite/粒子系统 |
| **手势追踪** | motion-engine (TF.js) | 已有，无缝集成 |
| **状态管理** | Zustand | 现有项目标准 |
| **音效** | motion-engine SFX (Web Audio) | 已有合成音效系统，新增水流/蒸汽音色 |

### 3.2 画布分层架构

```
z-index 0: <video>           — 摄像头（CSS: brightness(0.5) saturate(0.7)）
z-index 1: <canvas fluid>   — Three.js 流体（position:absolute, mix-blend-mode:screen）
z-index 2: <canvas pixi>    — PixiJS 游戏对象（transparent bg, 火符目标+粒子+HUD）
z-index 3: React HUD div    — 分数/计时 UI 叠层
```

### 3.3 motion-engine 新增模块

```
packages/motion-engine/src/
└── fluid/
    ├── FluidSim.ts             # 核心流体类 (Three.js 封装)
    ├── shaders/
    │   ├── vertex.ts           # 共享顶点 shader
    │   ├── advection.ts        # 半拉格朗日平流
    │   ├── curl.ts             # 涡量计算
    │   ├── vorticity.ts        # 涡量增强
    │   ├── divergence.ts       # 散度计算
    │   ├── pressure.ts         # 压力 Jacobi 迭代
    │   ├── gradientSubtract.ts # 梯度减去压力
    │   ├── splat.ts            # 手势注入
    │   ├── clear.ts            # 压力暖启动
    │   └── display.ts          # 水色渲染输出
    └── LICENSE-NOTICE.md       # PavelDoGreat MIT 版权声明
```

### 3.4 游戏 app 结构

```
apps/game-water-jutsu/src/
├── App.tsx                 # 三层画布主入口 + 摄像头 + 流体 + PixiJS
├── i18n.ts
├── main.tsx
├── store/useGameStore.ts   # idle|countdown|playing|result 状态机
├── game/
│   ├── constants.ts        # 游戏参数（目标速度/频率/得分/碰撞半径）
│   ├── FireTarget.ts       # 火符目标：Sprite + 抛物线运动 + 状态
│   ├── TargetSpawner.ts    # 难度曲线调度器
│   ├── HandToFluid.ts      # 手关键点速度向量 → FluidSim.splat()
│   └── collision.ts        # 手部位置 vs 目标几何距离碰撞检测
├── effects/
│   ├── SteamParticles.ts   # 命中时蒸汽粒子（复用 PopParticles 模式）
│   ├── ScreenShake.ts      # 重击震屏（复用 balloon-popper）
│   └── FloatingText.ts     # "+1" "+5" 飘字
└── components/
    ├── StartScreen.tsx
    ├── HUD.tsx
    ├── CountdownOverlay.tsx
    └── ResultScreen.tsx
```

---

## 四、游戏设计：水遁·击标

### 4.1 核心玩法

- 火符目标（🔥）从屏幕边缘以抛物线轨迹飞入
- 玩家挥动手部，流体水柱喷射而出
- 手掌（食指+掌心）进入目标命中半径 + 手部有速度 → 命中
- 命中特效：目标爆散 + 在命中点 splat 白色 dye（蒸汽） + 蒸汽粒子 + 加分飘字
- 单局 **60 秒**，结束显示得分
- 难度曲线：前 30s 1个/2s，后 30s 1个/1s，穿插火忍者（+5 分）

### 4.2 目标类型

| 类型 | 视觉 | 分值 | 速度 | 出现时间 |
|------|------|------|------|----------|
| 火符 | 🔥 橙红 Sprite | +1 | 普通 | 全程 |
| 火忍者 | 🥷 红色 Sprite | +5 | 较快 | 20s 后 |
| 逃跑惩罚 | — | -1 | — | 从屏幕逃逸时 |

### 4.3 碰撞模型

```
hit = distance(handPalmCenter, target.position) < (target.radius + HAND_RADIUS)
      AND handSpeed > MIN_HIT_SPEED
```

- `handSpeed` = EMA 平滑的手掌中心每帧位移量（像素/秒）
- `MIN_HIT_SPEED` = 150 px/s（过滤误触）
- 命中后目标进入 `hit` 状态，100ms 动画后移除

### 4.4 手势→流体映射

| 手势 | 流体行为 | 参数 |
|------|----------|------|
| 张开（open/any） | 多点喷射（指尖+掌心各 1 splat） | radius=0.15, force=速度向量×4000 |
| 捏合（pinch） | 集中高压水柱 | radius=0.06, force=速度向量×8000 |
| 静止 | 无 splat | — |

---

## 五、性能策略

### 5.1 自适应分辨率

```typescript
function getFluidTier(): 'high' | 'mid' | 'low' {
  if (window.devicePixelRatio >= 3) return 'low';    // 高 DPR 设备 → GPU 贵
  if (navigator.hardwareConcurrency <= 4) return 'mid'; // 低核数 → 算力不足
  return 'high';
}

const TIERS = {
  high: { simRes: 128, dyeRes: 1024, pressureIter: 20 },
  mid:  { simRes: 128, dyeRes: 512,  pressureIter: 15 },
  low:  { simRes: 64,  dyeRes: 256,  pressureIter: 10 },
};
```

### 5.2 移动端注意事项

- iOS Safari WebGL context 在 tab 后台会被回收：监听 `webglcontextlost` 事件，重建 FluidSim
- 移动端发热：单局 60s 后关闭流体 RAF，结算界面不跑流体
- Half-float 纹理：WebGL2 (iOS 14+ / Android Chrome 75+) 已全面支持

---

## 六、超越 William 的进阶路径（Phase 2）

1. **双手协同水龙**：双手各 1 股水流，聚合成水龙攻击 BOSS（magic-hand 已有双手追踪基础）
2. **喊出"水遁！"触发水墙**：麦克风音量 spike → 全屏 splat（roaring-motorbike 已验证该技术）
3. **结印释放**：识别巳→寅→申手印序列，sequence correct → 大招水遁（需自训练手势分类器）
4. **magic-hand 整合**：在已有 magic-hand 游戏中添加"水遁模式"作为第 4 种手势效果

---

## 七、版权声明

本项目流体 shader 移植自 **PavelDoGreat/WebGL-Fluid-Simulation** (MIT License)。
原版权声明详见 `packages/motion-engine/src/fluid/LICENSE-NOTICE.md`。
