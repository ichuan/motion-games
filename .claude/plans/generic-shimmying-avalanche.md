# 全站中英双语 i18n

## Context
用户希望网站（Hub + 4 个游戏）支持中英文切换，方便外国小朋友使用。默认跟随浏览器语言，Hub 右上角有切换按钮，语言偏好存 localStorage。

## 方案：motion-engine 内置极简 i18n，不引入第三方库

### 核心架构

```
packages/motion-engine/src/i18n/
  ├── locales.ts    # 公共翻译字典 + Locale 类型
  ├── lang.ts       # getLocale() / setLocale()（读写 localStorage）
  ├── useT.ts       # useT(gameTexts) hook（useSyncExternalStore）
  └── index.ts      # 统一导出

apps/game-*/src/
  └── i18n.ts       # 各游戏专有翻译字典
```

### 1. `packages/motion-engine/src/i18n/locales.ts`
公共 key（所有游戏共享）：
- startGame, loadingModel, firstLoad, backToHub, playAgain
- landscapePlz, landscapeDesc, cameraError, loading

### 2. `packages/motion-engine/src/i18n/lang.ts`
```ts
const KEY = 'motion-games-lang';
getLocale(): 'zh' | 'en'  // localStorage → navigator.language fallback
setLocale(l): void
```

### 3. `packages/motion-engine/src/i18n/useT.ts`
```ts
useT(gameTexts) → { t(key): string, locale, switchLocale }
```
- 用 `useSyncExternalStore` 监听语言变化，无需 Provider
- `t('key')` 从 merged(common + gameTexts) 中按当前 locale 取值

### 4. 各游戏 `src/i18n.ts`（新建 x4）
每个游戏定义自己的翻译 key：标题、说明、HUD 标签、结算标签、浮动文字等。

### 5. Hub 页面（vanilla JS）
- 所有需翻译的 HTML 元素加 `data-i18n="key"` 属性
- `</body>` 前内联 ~30 行 JS：读 localStorage / navigator.language → 遍历 `[data-i18n]` 替换文本
- 右上角固定按钮 `<button id="lang-toggle">` 点击切换

## 实施步骤

### Step 1: engine i18n 基础设施
- 新建 `packages/motion-engine/src/i18n/{locales,lang,useT,index}.ts`
- 更新 `packages/motion-engine/src/index.ts` 导出 useT, getLocale, setLocale, common, Locale

### Step 2: Hub 页面 i18n
- `apps/hub/index.html`：加 data-i18n 属性、语言切换按钮、内联翻译 JS

### Step 3: 气球捏捏乐 i18n（第一个模板）
- 新建 `apps/game-balloon-popper/src/i18n.ts`
- 改 StartScreen.tsx、ResultScreen.tsx、App.tsx（PortraitLock + cameraError）
- HUD 基本只有数字，改动极小（`s` 后缀等）
- CountdownOverlay 无需改（GO! 已是英文）

### Step 4: 咆哮摩托 i18n
- 新建 `apps/game-roaring-motorbike/src/i18n.ts`
- 改 StartScreen、ResultScreen、App.tsx（cameraError）
- HUD: `m` 后缀无需翻译

### Step 5: 魔法物理沙盒 i18n
- 新建 `apps/game-physics-sandbox/src/i18n.ts`
- 改 StartScreen、ResultScreen、HUD（`塔 Lv.X | 倒 X`）、App.tsx（PortraitLock + `全清` 浮动文字 + cameraError）

### Step 6: 棍子英雄 i18n
- 新建 `apps/game-stick-hero/src/i18n.ts`
- 改 StartScreen、ResultScreen、HUD（`BEST:` 标签）、App.tsx（cameraError）

### Step 7: engine useCamera 错误信息
- `packages/motion-engine/src/hooks/useCamera.ts` 中硬编码中文错误 → 用 getLocale() + common 翻译

### Step 8: 构建验证 + 部署
- `pnpm build:balloon && pnpm build:motorbike && pnpm build:sandbox && pnpm build:stick`
- 部署到服务器

### Step 9: 收尾
- Hub 首页游戏卡片排序：沙盒移到最后
- 更新 README.md

## 修改文件清单

**新建（~8）：**
- `packages/motion-engine/src/i18n/locales.ts`
- `packages/motion-engine/src/i18n/lang.ts`
- `packages/motion-engine/src/i18n/useT.ts`
- `packages/motion-engine/src/i18n/index.ts`
- `apps/game-balloon-popper/src/i18n.ts`
- `apps/game-roaring-motorbike/src/i18n.ts`
- `apps/game-physics-sandbox/src/i18n.ts`
- `apps/game-stick-hero/src/i18n.ts`

**修改（~18）：**
- `packages/motion-engine/src/index.ts`
- `packages/motion-engine/src/hooks/useCamera.ts`
- `apps/hub/index.html`
- 4x `StartScreen.tsx`（所有游戏）
- 4x `ResultScreen.tsx`（所有游戏）
- 4x `App.tsx`（所有游戏）
- `apps/game-physics-sandbox/src/components/HUD.tsx`（塔/倒 标签）
- `apps/game-stick-hero/src/components/HUD.tsx`（BEST 标签）

## 验证
1. 构建全部游戏无报错
2. 打开 Hub，右上角切换按钮在 中文/EN 之间切换，卡片文案随之变化
3. 进入任一游戏，StartScreen/HUD/ResultScreen 显示对应语言
4. 在 Hub 切英文 → 进游戏 → 游戏也是英文（localStorage 同步）
5. 新开隐身窗口（英文浏览器）→ 默认显示英文
