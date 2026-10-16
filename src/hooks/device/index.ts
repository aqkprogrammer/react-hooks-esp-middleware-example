// Public exports for the "device" hook category. Keep alphabetical.
export {
  useBattery,
  type BatteryManagerLike,
  type BatterySnapshot,
  type BatteryState,
} from './useBattery';
export { useDevicePixelRatio, type UseDevicePixelRatioOptions } from './useDevicePixelRatio';
export { useOrientation, type OrientationSource, type OrientationState } from './useOrientation';
export {
  usePointerPosition,
  type PointerPosition,
  type UsePointerPositionOptions,
} from './usePointerPosition';
export {
  useSpeechRecognition,
  type SpeechRecognitionControls,
  type SpeechRecognitionErrorCode,
  type SpeechRecognitionErrorInfo,
  type SpeechRecognitionLike,
  type SpeechRecognitionResultInfo,
  type SpeechRecognitionStatus,
  type UseSpeechRecognitionOptions,
} from './useSpeechRecognition';
export {
  useSpeechSynthesis,
  type SpeakOptions,
  type SpeechSynthesisControls,
} from './useSpeechSynthesis';
export { useVibration, type VibrationControls, type VibrationPattern } from './useVibration';
