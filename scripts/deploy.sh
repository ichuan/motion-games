#!/bin/bash
set -e

echo "Building balloon-popper..."
pnpm build:balloon

echo "Building roaring-motorbike..."
pnpm build:motorbike

echo "Deploying to games.981234.xyz..."
# Hub (static HTML) → root
rsync -avz apps/hub/index.html dev:/srv/games.981234.xyz/index.html
# Balloon popper → /balloon-popper/
rsync -avz --delete apps/game-balloon-popper/dist/ dev:/srv/games.981234.xyz/balloon-popper/
# Roaring motorbike → /roaring-motorbike/
rsync -avz --delete apps/game-roaring-motorbike/dist/ dev:/srv/games.981234.xyz/roaring-motorbike/

echo "Done! https://games.981234.xyz"
