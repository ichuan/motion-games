export interface Point2D {
  x: number;
  y: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface SmoothedHand {
  landmarks: Point2D[];
  thumbTip: Point2D;   // landmark 4
  indexTip: Point2D;    // landmark 8
}

export interface TrackingResult {
  hand: SmoothedHand | null;
  isTracking: boolean;
}

export interface FaceTrackingResult {
  tiltAngle: number | null;
  mouthOpenness: number | null;
  isTracking: boolean;
}
