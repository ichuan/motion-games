# Codex Entry

## Project

Motion Games is a browser camera-based motion game collection.

- Package manager: pnpm workspace.
- Shared engine: `packages/motion-engine`.
- Hub: `apps/hub`, static HTML/PWA.
- Games: `apps/game-balloon-popper`, `apps/game-stick-hero`, `apps/game-roaring-motorbike`, `apps/game-physics-sandbox`, `apps/game-magic-hand`, `apps/game-water-jutsu`, `apps/game-gesture-painter`.

## Commands

Install:

```bash
pnpm install
```

Develop one game:

```bash
pnpm dev:balloon
pnpm dev:stick
pnpm dev:motorbike
pnpm dev:sandbox
pnpm dev:magic
pnpm dev:water
pnpm dev:painter
```

Build one game:

```bash
pnpm build:balloon
pnpm build:stick
pnpm build:motorbike
pnpm build:sandbox
pnpm build:magic
pnpm build:water
pnpm build:painter
```

Known tests:

```bash
pnpm --filter game-water-jutsu test
pnpm --filter game-gesture-painter test
```

There is no root-level unified `build` or `test` script.

## Deployment

`pnpm deploy` / `bash scripts/deploy.sh` builds all games and rsyncs to `dev:/srv/games.981234.xyz/`.

Do not deploy without an explicit deploy request. The script uses `rsync --delete`.

## Browser Verification

- Camera APIs require HTTPS or localhost.
- Phone LAN HTTP usually is not a secure context.
- Hand/face models load from `https://games.981234.xyz/models`.
- `game-roaring-motorbike` also uses microphone input and has video-only fallback.
- `game-water-jutsu` depends on WebGL shader support and can lose context on mobile browsers.

## Safety Boundaries

- Do not commit generated `dist/`, `.vite/`, `*.tsbuildinfo`, `node_modules/`, or `tmp/`.
- Do not copy local API tokens from `.review-forge/config.local.yaml` or `.vscode/settings.json`.
- Do not replace model paths or deployment targets without checking `scripts/deploy.sh`.

## Known Documentation Gaps

- README may omit `game-water-jutsu`, but the app exists in code and deploy scripts.
- `packages/motion-engine` has tests but no package-level `test` script.
