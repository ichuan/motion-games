// Pseudo-3D road rendering using PixiJS Graphics
// Road is a trapezoid that narrows toward the vanishing point

import { ROAD_WIDTH_BOTTOM, ROAD_WIDTH_TOP, VANISH_Y } from './constants';

const LANE_COUNT = 3;
const DASH_LENGTH = 20;
const DASH_GAP = 15;
const ROADSIDE_COLOR = 0x4CAF50;
const ROAD_COLOR = 0x555555;
const LANE_COLOR = 0xCCCCCC;
const SHOULDER_COLOR = 0xFFFFFF;

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

  // Green background (roadside)
  g.rect(0, 0, screenW, screenH).fill({ color: ROADSIDE_COLOR });

  // Sky gradient at top
  const skyH = vanishY + 20;
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r = Math.round(0x87 + (0x60 - 0x87) * t);
    const gv = Math.round(0xCE + (0x90 - 0xCE) * t);
    const b = Math.round(0xEB + (0xD0 - 0xEB) * t);
    const color = (r << 16) | (gv << 8) | b;
    g.rect(0, (skyH * i) / steps, screenW, skyH / steps + 1).fill({ color });
  }

  // Road surface (trapezoid)
  g.moveTo(cx - topHalfW, vanishY)
    .lineTo(cx + topHalfW, vanishY)
    .lineTo(cx + botHalfW, screenH)
    .lineTo(cx - botHalfW, screenH)
    .closePath()
    .fill({ color: ROAD_COLOR });

  // Shoulder lines (white edges)
  drawRoadLine(g, cx, vanishY, screenH, -topHalfW, -botHalfW, SHOULDER_COLOR, 3);
  drawRoadLine(g, cx, vanishY, screenH, topHalfW, botHalfW, SHOULDER_COLOR, 3);

  // Lane dashes
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const laneT = lane / LANE_COUNT;
    const topX = -topHalfW + laneT * topHalfW * 2;
    const botX = -botHalfW + laneT * botHalfW * 2;
    drawDashedLaneLine(g, cx, vanishY, screenH, topX, botX, scrollOffset);
  }
}

function drawRoadLine(
  g: any, cx: number, vanishY: number, screenH: number,
  topOffset: number, botOffset: number, color: number, width: number,
) {
  g.moveTo(cx + topOffset, vanishY)
    .lineTo(cx + botOffset, screenH)
    .stroke({ color, width, alpha: 0.8 });
}

function drawDashedLaneLine(
  g: any, cx: number, vanishY: number, screenH: number,
  topOffset: number, botOffset: number, scrollOffset: number,
) {
  const roadH = screenH - vanishY;
  const totalLen = DASH_LENGTH + DASH_GAP;
  // Start offset based on scroll
  const startOffset = ((scrollOffset % totalLen) + totalLen) % totalLen;
  const numDashes = Math.ceil(roadH / 8);

  for (let i = -2; i < numDashes; i++) {
    const yStart = vanishY + (i * totalLen + startOffset) * (roadH / (numDashes * totalLen / 2));
    const yEnd = yStart + DASH_LENGTH * (roadH / (numDashes * totalLen / 2));

    if (yEnd < vanishY || yStart > screenH) continue;

    const clampedStart = Math.max(vanishY, yStart);
    const clampedEnd = Math.min(screenH, yEnd);

    // Interpolate X position based on Y
    const t1 = (clampedStart - vanishY) / roadH;
    const t2 = (clampedEnd - vanishY) / roadH;
    const x1 = cx + topOffset + (botOffset - topOffset) * t1;
    const x2 = cx + topOffset + (botOffset - topOffset) * t2;

    // Width scales with perspective
    const w = 1 + t1 * 2;

    g.moveTo(x1, clampedStart)
      .lineTo(x2, clampedEnd)
      .stroke({ color: LANE_COLOR, width: w, alpha: 0.5 });
  }
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
  const x = cx + laneX * halfW * 0.8; // 0.8 to keep bike within road

  return { x, y, scale: 0.3 + depth * 0.7 };
}
