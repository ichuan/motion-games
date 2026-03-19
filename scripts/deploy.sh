#!/bin/bash
set -e

echo "Building balloon-popper..."
pnpm build:balloon

echo "Building roaring-motorbike..."
pnpm build:motorbike

echo "Building physics-sandbox..."
pnpm build:sandbox

echo "Building stick-hero..."
pnpm build:stick

echo "Deploying to games.981234.xyz..."
# Hub (static HTML) → root
rsync -avz apps/hub/index.html dev:/srv/games.981234.xyz/index.html
# Balloon popper → /balloon-popper/
rsync -avz --delete apps/game-balloon-popper/dist/ dev:/srv/games.981234.xyz/balloon-popper/
# Roaring motorbike → /roaring-motorbike/
rsync -avz --delete apps/game-roaring-motorbike/dist/ dev:/srv/games.981234.xyz/roaring-motorbike/
# Physics sandbox → /physics-sandbox/
rsync -avz --delete apps/game-physics-sandbox/dist/ dev:/srv/games.981234.xyz/physics-sandbox/

# Stick hero → /stick-hero/
rsync -avz --delete apps/game-stick-hero/dist/ dev:/srv/games.981234.xyz/stick-hero/

echo "Done! https://games.981234.xyz"
