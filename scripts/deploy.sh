#!/bin/bash
set -e

echo "Building balloon-popper..."
pnpm build:balloon

echo "Deploying to games.981234.xyz..."
rsync -avz --delete apps/game-balloon-popper/dist/ dev:/srv/games.981234.xyz/

echo "Done! https://games.981234.xyz"
