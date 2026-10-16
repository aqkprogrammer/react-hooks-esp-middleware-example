import { useCallback, useEffect, useRef, useState } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { useIsSupported } from './shared';

export type GeolocationErrorKind =
  'permission-denied' | 'position-unavailable' | 'timeout' | 'unsupported';

export interface GeolocationError {
  kind: GeolocationErrorKind;
  /** `GeolocationPositionError.code` (1–3), or `0` for `unsupported`. */
  code: number;
  message: string;
}

export type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseGeolocationOptions {
  /** Ask for GPS-level accuracy (slower, more battery). Default `false`. */
  enableHighAccuracy?: boolean;
  /** Give up after this many ms. Default `Infinity` (browser default). */
  timeout?: number;
  /** Accept a cached position up to this age in ms. Default `0`. */
  maximumAge?: number;
}

export interface UseGeolocationResult {
  /** `'geolocation' in navigator`. `false` on the server and during hydration. */
  isSupported: boolean;
  status: GeolocationStatus;
  /** Shorthand for `status === 'loading'`. */
  loading: boolean;
  /** The latest position, kept while a new request is loading or after a later error. */
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  /** The user (or a permissions policy / insecure origin) refused access. Do not ask again automatically. */
  isPermissionDenied: boolean;
  /** `true` between `watchPosition()` and `clearWatch()`. */
  isWatching: boolean;
  /** One-shot request. Triggers the permission prompt the first time. */
  getCurrentPosition: () => void;
  /** Continuous updates until `clearWatch()` or unmount. */
  watchPosition: () => void;
  clearWatch: () => void;
}

const supportsGeolocation = () =>
  isBrowser && typeof navigator !== 'undefined' && 'geolocation' in navigator;

const KINDS: Record<number, GeolocationErrorKind> = {
  1: 'permission-denied',
  2: 'position-unavailable',
  3: 'timeout',
};

function normalise(error: GeolocationPositionError): GeolocationError {
  return {
    kind: KINDS[error.code] ?? 'position-unavailable',
    code: error.code,
    message: error.message,
  };
}

const UNSUPPORTED: GeolocationError = {
  kind: 'unsupported',
  code: 0,
  message: 'The Geolocation API is not available in this browser.',
};

/**
 * Reads the device position with the Geolocation API — **only when asked**.
 * Nothing happens on mount, because requesting location without a clear user
 * action is hostile (and browsers increasingly block such prompts).
 *
 * - `getCurrentPosition()` for a one-shot fix, `watchPosition()` /
 *   `clearWatch()` for live tracking. The watch is cleared on unmount.
 * - Errors are normalised to `{ kind, code, message }`; `isPermissionDenied`
 *   tells you to show instructions instead of asking again.
 * - Results from an older request never overwrite a newer one.
 * - Requires a secure context (HTTPS/localhost); on insecure origins browsers
 *   report `permission-denied`.
 *
 * Privacy: a position is personal data. Request it only for a feature the user
 * asked for, explain why, keep only the precision you need, and do not send or
 * store it without consent.
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const optionsRef = useLatest(options);
  const isSupported = useIsSupported(supportsGeolocation);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  const positionOptions = useCallback((): PositionOptions => {
    const { enableHighAccuracy, timeout, maximumAge } = optionsRef.current;
    const result: PositionOptions = {};
    if (enableHighAccuracy !== undefined) result.enableHighAccuracy = enableHighAccuracy;
    if (timeout !== undefined) result.timeout = timeout;
    if (maximumAge !== undefined) result.maximumAge = maximumAge;
    return result;
  }, [optionsRef]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && supportsGeolocation()) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  // Clear any active watch on unmount.
  useEffect(() => stopWatch, [stopWatch]);

  const handlers = useCallback((request: number) => {
    const isCurrent = () => request === requestRef.current;
    return {
      onSuccess: (next: GeolocationPosition) => {
        if (!isCurrent()) return;
        setPosition(next);
        setError(null);
        setStatus('success');
      },
      onError: (failure: GeolocationPositionError) => {
        if (!isCurrent()) return;
        setError(normalise(failure));
        setStatus('error');
      },
    };
  }, []);

  const getCurrentPosition = useCallback(() => {
    stopWatch();
    setIsWatching(false);
    const request = ++requestRef.current;
    if (!supportsGeolocation()) {
      setError(UNSUPPORTED);
      setStatus('error');
      return;
    }
    setStatus('loading');
    const { onSuccess, onError } = handlers(request);
    navigator.geolocation.getCurrentPosition(onSuccess, onError, positionOptions());
  }, [handlers, positionOptions, stopWatch]);

  const watchPosition = useCallback(() => {
    stopWatch();
    const request = ++requestRef.current;
    if (!supportsGeolocation()) {
      setIsWatching(false);
      setError(UNSUPPORTED);
      setStatus('error');
      return;
    }
    setStatus('loading');
    setIsWatching(true);
    const { onSuccess, onError } = handlers(request);
    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      (failure) => {
        onError(failure);
        // A denied permission will not recover by itself; stop watching.
        if (failure.code === 1 && request === requestRef.current) {
          stopWatch();
          setIsWatching(false);
        }
      },
      positionOptions(),
    );
  }, [handlers, positionOptions, stopWatch]);

  const clearWatch = useCallback(() => {
    requestRef.current += 1;
    stopWatch();
    setIsWatching(false);
    setStatus((previous) => (previous === 'loading' ? 'idle' : previous));
  }, [stopWatch]);

  return {
    isSupported,
    status,
    loading: status === 'loading',
    position,
    error,
    isPermissionDenied: error?.kind === 'permission-denied',
    isWatching,
    getCurrentPosition,
    watchPosition,
    clearWatch,
  };
}
