// Tracking
export { createCamera } from './tracking/camera';
export { createHandDetector } from './tracking/hand-detector';
export type { HandDetector } from './tracking/hand-detector';
export { createFaceDetector } from './tracking/face-detector';
export type { FaceDetector } from './tracking/face-detector';
export type { Point2D, HandLandmark, SmoothedHand, TrackingResult, FaceTrackingResult } from './tracking/types';

// Filter
export { EMAFilter } from './filter/ema';

// Input
export { PinchDetector } from './input/pinch-detector';
export type { PinchState, PinchEvent, PinchEventType } from './input/types';
export { TiltSteering } from './input/tilt-steering';

// Audio
export { SFX, unlockAudio } from './audio/synth-sfx';
export { MicVolume } from './audio/mic-volume';

// Cursor
export type { CursorState } from './cursor/types';
export { CursorOverlay } from './components/CursorOverlay';

// i18n
export { useT, switchLocale, getLocale, setLocale, common } from './i18n';
export type { Locale, CommonKey } from './i18n';

// Hooks
export { useCamera } from './hooks/useCamera';
export { useHandTracking } from './hooks/useHandTracking';
export { usePinchDetector } from './hooks/usePinchDetector';
export { useCursor } from './hooks/useCursor';
export { useFaceTracking } from './hooks/useFaceTracking';
export { useMicVolume } from './hooks/useMicVolume';
export { useWakeLock } from './hooks/useWakeLock';
