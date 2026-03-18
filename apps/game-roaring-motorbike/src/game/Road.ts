// Pseudo-3D road rendering — cute & colorful style
import { ROAD_WIDTH_BOTTOM, ROAD_WIDTH_TOP, VANISH_Y } from './constants';

const LANE_COUNT = 3;
const DASH_LENGTH = 20;
const DASH_GAP = 15;

// Pastel road palette
const GRASS_COLOR_1 = 0x7CB342;  // brighter green
const GRASS_COLOR_2 = 0x558B2F;  // darker green stripe
const ROAD_COLOR = 0x616161;
const LANE_COLOR = 0xFFFFFF;
const SHOULDER_COLOR = 0xFFEE58; // yellow shoulder lines
const CURB_COLOR_1 = 0xEF5350;   // red-white curbs
const CURB_COLOR_2 = 0xFFFFFF;

// Scenery colors
const TREE_TRUNK = 0x795548;
const TREE_CROWN = 0x4CAF50;
const TREE_CROWN_DARK = 0x388E3C;
const HOUSE_COLORS = [0xFFAB91, 0x90CAF9, 0xCE93D8, 0xFFF59D, 0x80DEEA];
const ROOF_COLORS = [0xD32F2F, 0x5D4037, 0x1565C0, 0x6A1B9A];
const CLOUD_COLOR = 0xFFFFFF;

export function drawRoad(
  g: any,
  screenW: number,
  screenH: number,
  scrollOffset: number,
) {
  const vanishY = screenH * VANISH_Y;
  const roadH = screenH - vanishY;
  const cx = screenW / 2;

  const topHalfW = (screenW * ROAD_WIDTH_TOP) / 2;
  const botHalfW = (screenW * ROAD_WIDTH_BOTTOM) / 2;

  // ── Sky gradient (warm sunset-like) ──
  const skyH = vanishY + 10;
  const skySteps = 16;
  for (let i = 0; i < skySteps; i++) {
    const t = i / skySteps;
    const r = Math.round(0x87 + (0xB3 - 0x87) * t);
    const gv = Math.round(0xCE + (0xE5 - 0xCE) * t);
    const b = Math.round(0xEB + (0xF5 - 0xEB) * t);
    const color = (r << 16) | (gv << 8) | b;
    g.rect(0, (skyH * i) / skySteps, screenW, skyH / skySteps + 1).fill({ color });
  }

  // ── Clouds (static, cute round blobs) ──
  drawCloud(g, screenW * 0.15, vanishY * 0.35, 25);
  drawCloud(g, screenW * 0.55, vanishY * 0.2, 30);
  drawCloud(g, screenW * 0.85, vanishY * 0.45, 20);

  // ── Sun ──
  g.circle(screenW * 0.82, vanishY * 0.25, 18).fill({ color: 0xFFEB3B, alpha: 0.9 });
  g.circle(screenW * 0.82, vanishY * 0.25, 24).fill({ color: 0xFFEB3B, alpha: 0.2 });

  // ── Rolling grass hills ──
  // Near grass
  g.rect(0, vanishY - 5, screenW, screenH - vanishY + 10).fill({ color: GRASS_COLOR_1 });

  // Grass stripes for depth
  const stripeCount = 12;
  for (let i = 0; i < stripeCount; i++) {
    const t = i / stripeCount;
    const sy = vanishY + t * roadH;
    const sh = roadH / stripeCount;
    if (i % 2 === 0) {
      g.rect(0, sy, screenW, sh + 1).fill({ color: GRASS_COLOR_2, alpha: 0.2 });
    }
  }

  // ── Road surface (trapezoid) ──
  g.moveTo(cx - topHalfW, vanishY)
    .lineTo(cx + topHalfW, vanishY)
    .lineTo(cx + botHalfW, screenH)
    .lineTo(cx - botHalfW, screenH)
    .closePath()
    .fill({ color: ROAD_COLOR });

  // Subtle road highlight (lighter center strip)
  const cTopW = topHalfW * 0.15;
  const cBotW = botHalfW * 0.15;
  g.moveTo(cx - cTopW, vanishY)
    .lineTo(cx + cTopW, vanishY)
    .lineTo(cx + cBotW, screenH)
    .lineTo(cx - cBotW, screenH)
    .closePath()
    .fill({ color: 0x757575, alpha: 0.3 });

  // ── Curb stripes (red-white alternating) ──
  drawCurbStripes(g, cx, vanishY, screenH, -topHalfW, -botHalfW, scrollOffset);
  drawCurbStripes(g, cx, vanishY, screenH, topHalfW, botHalfW, scrollOffset);

  // ── Lane dashes ──
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const laneT = lane / LANE_COUNT;
    const topX = -topHalfW + laneT * topHalfW * 2;
    const botX = -botHalfW + laneT * botHalfW * 2;
    drawDashedLaneLine(g, cx, vanishY, screenH, topX, botX, scrollOffset);
  }

  // ── Roadside scenery ──
  drawRoadsideScenery(g, cx, vanishY, screenH, topHalfW, botHalfW, screenW, scrollOffset);
}

function drawCloud(g: any, x: number, y: number, size: number) {
  g.circle(x, y, size * 0.6).fill({ color: CLOUD_COLOR, alpha: 0.85 });
  g.circle(x - size * 0.5, y + size * 0.15, size * 0.45).fill({ color: CLOUD_COLOR, alpha: 0.85 });
  g.circle(x + size * 0.5, y + size * 0.1, size * 0.5).fill({ color: CLOUD_COLOR, alpha: 0.85 });
  g.circle(x + size * 0.15, y - size * 0.25, size * 0.4).fill({ color: CLOUD_COLOR, alpha: 0.85 });
}

function drawCurbStripes(
  g: any, cx: number, vanishY: number, screenH: number,
  topOffset: number, botOffset: number, scrollOffset: number,
) {
  const roadH = screenH - vanishY;
  const stripeLen = 12;
  const numStripes = 20;

  for (let i = 0; i < numStripes; i++) {
    const t1 = (i * 2 * stripeLen + (scrollOffset % (stripeLen * 2))) / (roadH * 1.5);
    const t2 = t1 + stripeLen / (roadH * 1.5);
    if (t1 > 1 || t2 < 0) continue;

    const ct1 = Math.max(0, Math.min(1, t1));
    const ct2 = Math.max(0, Math.min(1, t2));

    const y1 = vanishY + ct1 * roadH;
    const y2 = vanishY + ct2 * roadH;
    const x1 = cx + topOffset + (botOffset - topOffset) * ct1;
    const x2 = cx + topOffset + (botOffset - topOffset) * ct2;
    const w = 2 + ct1 * 4;

    const color = i % 2 === 0 ? CURB_COLOR_1 : CURB_COLOR_2;
    g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: w, alpha: 0.9 });
  }
}

function drawDashedLaneLine(
  g: any, cx: number, vanishY: number, screenH: number,
  topOffset: number, botOffset: number, scrollOffset: number,
) {
  const roadH = screenH - vanishY;
  const totalLen = DASH_LENGTH + DASH_GAP;
  const startOffset = ((scrollOffset % totalLen) + totalLen) % totalLen;
  const numDashes = Math.ceil(roadH / 8);

  for (let i = -2; i < numDashes; i++) {
    const yStart = vanishY + (i * totalLen + startOffset) * (roadH / (numDashes * totalLen / 2));
    const yEnd = yStart + DASH_LENGTH * (roadH / (numDashes * totalLen / 2));

    if (yEnd < vanishY || yStart > screenH) continue;

    const clampedStart = Math.max(vanishY, yStart);
    const clampedEnd = Math.min(screenH, yEnd);

    const t1 = (clampedStart - vanishY) / roadH;
    const t2 = (clampedEnd - vanishY) / roadH;
    const x1 = cx + topOffset + (botOffset - topOffset) * t1;
    const x2 = cx + topOffset + (botOffset - topOffset) * t2;

    const w = 1.5 + t1 * 2.5;

    g.moveTo(x1, clampedStart)
      .lineTo(x2, clampedEnd)
      .stroke({ color: LANE_COLOR, width: w, alpha: 0.7 });
  }
}

function drawRoadsideScenery(
  g: any, cx: number, vanishY: number, screenH: number,
  topHalfW: number, botHalfW: number, screenW: number, scrollOffset: number,
) {
  const roadH = screenH - vanishY;

  // Deterministic scenery positions using scroll
  const seed = Math.floor(scrollOffset * 0.02);
  for (let i = 0; i < 8; i++) {
    const hash = ((seed + i * 137) * 7919) & 0xFFFF;
    const t = ((i * 0.12 + (scrollOffset * 0.001) % 1) + hash * 0.00001) % 1;
    if (t < 0.05 || t > 0.95) continue;

    const y = vanishY + t * roadH;
    const scale = 0.2 + t * 0.8;
    const halfW = topHalfW + (botHalfW - topHalfW) * t;

    // Alternate left/right
    const side = i % 2 === 0 ? -1 : 1;
    const edgeX = cx + side * halfW;
    const offsetX = side * (15 + scale * 25);
    const x = edgeX + offsetX;

    // Don't draw if off screen
    if (x < -20 || x > screenW + 20) continue;

    if (hash % 3 === 0) {
      // Tree
      drawTree(g, x, y, scale);
    } else if (hash % 3 === 1) {
      // Small house
      drawSmallHouse(g, x, y, scale, hash);
    } else {
      // Bush
      drawBush(g, x, y, scale);
    }
  }
}

function drawTree(g: any, x: number, y: number, scale: number) {
  const trunkW = 4 * scale;
  const trunkH = 16 * scale;
  const crownR = 12 * scale;

  // Shadow
  g.ellipse(x, y, crownR * 0.8, crownR * 0.3).fill({ color: 0x000000, alpha: 0.15 });
  // Trunk
  g.rect(x - trunkW / 2, y - trunkH, trunkW, trunkH).fill({ color: TREE_TRUNK });
  // Crown (layered circles for cute look)
  g.circle(x, y - trunkH - crownR * 0.3, crownR).fill({ color: TREE_CROWN_DARK });
  g.circle(x - crownR * 0.4, y - trunkH - crownR * 0.5, crownR * 0.7).fill({ color: TREE_CROWN });
  g.circle(x + crownR * 0.3, y - trunkH - crownR * 0.6, crownR * 0.65).fill({ color: TREE_CROWN });
  // Highlight dot
  g.circle(x - crownR * 0.2, y - trunkH - crownR * 0.8, crownR * 0.2).fill({ color: 0xA5D6A7, alpha: 0.7 });
}

function drawBush(g: any, x: number, y: number, scale: number) {
  const r = 8 * scale;
  g.ellipse(x, y, r * 1.3, r * 0.7).fill({ color: 0x66BB6A });
  g.ellipse(x - r * 0.5, y - r * 0.2, r * 0.7, r * 0.5).fill({ color: 0x43A047 });
  g.ellipse(x + r * 0.4, y - r * 0.15, r * 0.6, r * 0.45).fill({ color: 0x4CAF50 });
  // Little flower
  g.circle(x + r * 0.3, y - r * 0.5, 2 * scale).fill({ color: 0xFFF176, alpha: 0.9 });
}

function drawSmallHouse(g: any, x: number, y: number, scale: number, hash: number) {
  const w = 14 * scale;
  const h = 12 * scale;
  const roofH = 7 * scale;

  const houseColor = HOUSE_COLORS[hash % HOUSE_COLORS.length];
  const roofColor = ROOF_COLORS[hash % ROOF_COLORS.length];

  // Shadow
  g.ellipse(x, y, w * 0.7, h * 0.2).fill({ color: 0x000000, alpha: 0.1 });
  // Body
  g.roundRect(x - w / 2, y - h, w, h, 1 * scale).fill({ color: houseColor });
  // Roof (triangle)
  g.moveTo(x - w * 0.65, y - h)
    .lineTo(x, y - h - roofH)
    .lineTo(x + w * 0.65, y - h)
    .closePath()
    .fill({ color: roofColor });
  // Window
  g.roundRect(x - w * 0.15, y - h * 0.7, w * 0.3, w * 0.3, 1 * scale)
    .fill({ color: 0xBBDEFB, alpha: 0.9 });
  // Door
  g.roundRect(x - w * 0.12, y - h * 0.35, w * 0.24, h * 0.35, 1 * scale)
    .fill({ color: TREE_TRUNK });
}

/** Given a normalized lane position (-1 to 1) and depth (0=vanish, 1=bottom),
 *  return the screen X,Y position */
export function laneToScreen(
  laneX: number,
  depth: number,
  screenW: number,
  screenH: number,
): { x: number; y: number; scale: number } {
  const vanishY = screenH * VANISH_Y;
  const roadH = screenH - vanishY;
  const y = vanishY + depth * roadH;

  const topHalfW = (screenW * ROAD_WIDTH_TOP) / 2;
  const botHalfW = (screenW * ROAD_WIDTH_BOTTOM) / 2;
  const halfW = topHalfW + (botHalfW - topHalfW) * depth;
  const cx = screenW / 2;
  const x = cx + laneX * halfW * 0.8;

  return { x, y, scale: 0.3 + depth * 0.7 };
}
