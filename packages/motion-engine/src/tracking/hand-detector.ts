import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export type HandDetector = handPoseDetection.HandDetector;

export async function createHandDetector(): Promise<HandDetector> {
  await tf.ready();
  return handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: 'tfjs',
      maxHands: 1,
      modelType: 'lite',
    },
  );
}
