// Public exports for the "timing" hook category. Keep alphabetical.
export {
  useAnimationFrame,
  type AnimationFrameCallback,
  type UseAnimationFrameOptions,
} from './useAnimationFrame';
export { useDebounce, type UseDebounceOptions } from './useDebounce';
export {
  useDebouncedCallback,
  type DebouncedFunction,
  type UseDebouncedCallbackOptions,
} from './useDebouncedCallback';
export {
  useDoubleClick,
  type UseDoubleClickOptions,
  type UseDoubleClickReturn,
} from './useDoubleClick';
export { DEFAULT_IDLE_EVENTS, useIdle, type UseIdleOptions, type UseIdleReturn } from './useIdle';
export { useInterval } from './useInterval';
export {
  useLongPress,
  type LongPressEvent,
  type LongPressHandlers,
  type UseLongPressOptions,
} from './useLongPress';
export { useThrottle } from './useThrottle';
export { useThrottledCallback, type UseThrottledCallbackOptions } from './useThrottledCallback';
export { useTimeout, type UseTimeoutOptions, type UseTimeoutReturn } from './useTimeout';
