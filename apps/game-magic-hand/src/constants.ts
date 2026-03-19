import type { Point2D } from '@motion-games/engine';

// MediaPipe Hand Landmark indices
export const WRIST = 0;
export const THUMB_CMC = 1;
export const THUMB_MCP = 2;
export const THUMB_IP = 3;
export const THUMB_TIP = 4;
export const INDEX_MCP = 5;
export const INDEX_PIP = 6;
export const INDEX_DIP = 7;
export const INDEX_TIP = 8;
export const MIDDLE_MCP = 9;
export const MIDDLE_PIP = 10;
export const MIDDLE_DIP = 11;
export const MIDDLE_TIP = 12;
export const RING_MCP = 13;
export const RING_PIP = 14;
export const RING_DIP = 15;
export const RING_TIP = 16;
export const PINKY_MCP = 17;
export const PINKY_PIP = 18;
export const PINKY_DIP = 19;
export const PINKY_TIP = 20;

export const FINGERTIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];

// MediaPipe standard hand connections
export const CONNECTIONS: [number, number][] = [
  // Thumb
  [WRIST, THUMB_CMC], [THUMB_CMC, THUMB_MCP], [THUMB_MCP, THUMB_IP], [THUMB_IP, THUMB_TIP],
  // Index
  [WRIST, INDEX_MCP], [INDEX_MCP, INDEX_PIP], [INDEX_PIP, INDEX_DIP], [INDEX_DIP, INDEX_TIP],
  // Middle
  [WRIST, MIDDLE_MCP], [MIDDLE_MCP, MIDDLE_PIP], [MIDDLE_PIP, MIDDLE_DIP], [MIDDLE_DIP, MIDDLE_TIP],
  // Ring
  [WRIST, RING_MCP], [RING_MCP, RING_PIP], [RING_PIP, RING_DIP], [RING_DIP, RING_TIP],
  // Pinky
  [WRIST, PINKY_MCP], [PINKY_MCP, PINKY_PIP], [PINKY_PIP, PINKY_DIP], [PINKY_DIP, PINKY_TIP],
  // Palm cross-connections
  [INDEX_MCP, MIDDLE_MCP], [MIDDLE_MCP, RING_MCP], [RING_MCP, PINKY_MCP],
];

// Finger colors: thumb=red, index=orange, middle=green, ring=blue, pinky=purple
export const FINGER_COLORS = [0xFF4444, 0xFF8800, 0x44FF88, 0x4488FF, 0xAA44FF];

// Get color for a connection based on which finger it belongs to
export function getConnectionColor(a: number, b: number): number {
  const max = Math.max(a, b);
  if (max <= 4) return FINGER_COLORS[0];  // thumb
  if (max <= 8) return FINGER_COLORS[1];  // index
  if (max <= 12) return FINGER_COLORS[2]; // middle
  if (max <= 16) return FINGER_COLORS[3]; // ring
  return FINGER_COLORS[4];                // pinky
}

// Palm center approximation
export function palmCenter(landmarks: Point2D[]): Point2D {
  const w = landmarks[WRIST];
  const im = landmarks[INDEX_MCP];
  const rm = landmarks[RING_MCP];
  return {
    x: (w.x + im.x + rm.x) / 3,
    y: (w.y + im.y + rm.y) / 3,
  };
}

// Palm radius approximation
export function palmRadius(landmarks: Point2D[]): number {
  const center = palmCenter(landmarks);
  const mm = landmarks[MIDDLE_MCP];
  return Math.hypot(center.x - mm.x, center.y - mm.y);
}
