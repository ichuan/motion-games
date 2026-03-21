import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export type HandDetector = handPoseDetection.HandDetector;

// Self-hosted model URLs — avoids tfhub.dev which is unreachable in some regions
const MODEL_BASE = 'https://games.981234.xyz/models';
const DETECTOR_MODEL_URL = `${MODEL_BASE}/hand_detector/model.json`;
const LANDMARK_MODEL_URL = `${MODEL_BASE}/hand_landmark/model.json`;

async function prefetchModel(url: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Model fetch failed: ${url} → HTTP ${resp.status}`);
  }
  // 验证返回的是合法 JSON
  const text = await resp.text();
  try {
    JSON.parse(text);
  } catch {
    throw new Error(`Model response is not valid JSON: ${url} (got ${text.slice(0, 100)})`);
  }
}

export async function createHandDetector(): Promise<HandDetector> {
  // 先预检模型文件可达性，提供更清晰的错误信息
  try {
    await Promise.all([
      prefetchModel(DETECTOR_MODEL_URL),
      prefetchModel(LANDMARK_MODEL_URL),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`模型下载失败: ${msg}`);
  }

  await tf.ready();
  return handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: 'tfjs',
      maxHands: 1,
      modelType: 'lite',
      detectorModelUrl: DETECTOR_MODEL_URL,
      landmarkModelUrl: LANDMARK_MODEL_URL,
    },
  );
}
