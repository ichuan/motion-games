import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export type HandDetector = handPoseDetection.HandDetector;

// Self-hosted model URLs — avoids tfhub.dev which is unreachable in some regions
const MODEL_BASE = 'https://games.981234.xyz/models';
const DETECTOR_MODEL_URL = `${MODEL_BASE}/hand_detector/model.json`;
const LANDMARK_MODEL_URL = `${MODEL_BASE}/hand_landmark/model.json`;

export async function createHandDetector(): Promise<HandDetector> {
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
