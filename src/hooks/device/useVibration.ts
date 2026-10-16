import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { isBrowser } from '../internal/env';
import { useBrowserSupport } from './support';

/** A duration in ms, or alternating vibrate/pause durations: `[200, 100, 200]`. */
export type VibrationPattern = number | readonly number[];

export interface VibrationControls {
  /** `navigator.vibrate` exists. Always `false` on iOS/macOS Safari and on the server. */
  isSupported: boolean;
  /** `true` from a successful `vibrate()` call until the pattern has played (or was cancelled). */
  isVibrating: boolean;
  /**
   * Starts a pattern, replacing any pattern already playing. Returns the
   * browser's answer: `false` when unsupported, when the pattern is invalid,
   * or when the browser blocks the call (Chromium requires a prior user
   * gesture on the page).
   */
  vibrate: (pattern: VibrationPattern) => boolean;
  /** Stops any pattern started by this page (`navigator.vibrate(0)`). */
  cancel: () => void;
}

const detect = () => isBrowser && typeof navigator.vibrate === 'function';

function patternDuration(pattern: VibrationPattern): number {
  return typeof pattern === 'number'
    ? Math.max(0, pattern)
    : pattern.reduce((total, step) => total + Math.max(0, step), 0);
}

type TimerRef = RefObject<ReturnType<typeof setTimeout> | undefined>;

function clearTimer(ref: TimerRef): void {
  if (ref.current !== undefined) clearTimeout(ref.current);
  ref.current = undefined;
}

/**
 * Wraps the Vibration API (`navigator.vibrate`).
 *
 * - Feature-detected: Safari (iOS and macOS) never shipped it, and desktop
 *   hardware usually has no motor, in which case calls succeed but nothing happens.
 * - Call `vibrate()` from a user gesture (click/tap): Chromium ignores calls
 *   made before the user has interacted with the page.
 * - A pattern started by this component is cancelled when it unmounts.
 */
export function useVibration(): VibrationControls {
  const isSupported = useBrowserSupport(detect);
  const [isVibrating, setIsVibrating] = useState(false);
  const timerRef: TimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef(false);

  const cancel = useCallback(() => {
    clearTimer(timerRef);
    if (detect()) navigator.vibrate(0);
    activeRef.current = false;
    setIsVibrating(false);
  }, []);

  const vibrate = useCallback((pattern: VibrationPattern): boolean => {
    if (!detect()) return false;
    clearTimer(timerRef);
    const accepted = navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    const duration = accepted ? patternDuration(pattern) : 0;
    activeRef.current = duration > 0;
    setIsVibrating(duration > 0);
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        activeRef.current = false;
        setIsVibrating(false);
      }, duration);
    }
    return accepted;
  }, []);

  useEffect(
    () => () => {
      clearTimer(timerRef);
      if (activeRef.current && detect()) navigator.vibrate(0);
      activeRef.current = false;
    },
    [],
  );

  return { isSupported, isVibrating, vibrate, cancel };
}
