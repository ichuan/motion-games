import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

export type FaceDetector = faceLandmarksDetection.FaceLandmarksDetector;

export async function createFaceDetector(): Promise<FaceDetector> {
  await tf.ready();
  return faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
      runtime: 'tfjs' as const,
      maxFaces: 1,
      refineLandmarks: false,
    },
  );
}
