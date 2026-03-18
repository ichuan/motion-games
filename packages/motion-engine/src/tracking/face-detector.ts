import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export type FaceDetector = faceLandmarksDetection.FaceLandmarksDetector;

// Self-hosted model URLs — avoids tfhub.dev which is unreachable in some regions
const MODEL_BASE = 'https://games.981234.xyz/models';
const DETECTOR_MODEL_URL = `${MODEL_BASE}/face_detection/model.json`;
const LANDMARK_MODEL_URL = `${MODEL_BASE}/face_mesh/model.json`;

export async function createFaceDetector(): Promise<FaceDetector> {
  await tf.ready();
  return faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
      runtime: 'tfjs' as const,
      maxFaces: 1,
      refineLandmarks: false,
      detectorModelUrl: DETECTOR_MODEL_URL,
      landmarkModelUrl: LANDMARK_MODEL_URL,
    },
  );
}
