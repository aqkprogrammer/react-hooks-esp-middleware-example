import { useEffect } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';

/**
 * @param deltaMs Milliseconds since the previous frame (`0` on the first
 *   frame after starting or resuming, so paused time is never counted).
 * @param timestamp The `requestAnimationFrame` timestamp.
 */
export type AnimationFrameCallback = (deltaMs: number, timestamp: DOMHighResTimeStamp) => void;

export interface UseAnimationFrameOptions {
  /** Stops the loop while `true`. Default `false`. */
  paused?: boolean;
}

/**
 * Runs `callback` on every animation frame until unmounted or paused.
 *
 * - Uses the latest `callback` without restarting the loop.
 * - Passes the time since the previous frame so animations can be
 *   frame-rate independent (`position += speed * deltaMs`).
 * - Cancels the pending frame on pause/unmount. Browsers also stop calling
 *   rAF in background tabs.
 * - No-op on the server and where `requestAnimationFrame` is missing.
 *
 * Calling `setState` every frame re-renders 60+ times a second: for visual
 * effects prefer mutating a DOM node via a ref (or CSS animations) and keep
 * React state for what the UI must know.
 */
export function useAnimationFrame(
  callback: AnimationFrameCallback,
  options: UseAnimationFrameOptions = {},
): void {
  const { paused = false } = options;
  const callbackRef = useLatest(callback);

  useEffect(() => {
    if (paused || !isBrowser || typeof window.requestAnimationFrame !== 'function') return;
    let active = true;
    let previous: number | undefined;
    let frameId = 0;
    const loop = (timestamp: number) => {
      const delta = previous === undefined ? 0 : timestamp - previous;
      previous = timestamp;
      callbackRef.current(delta, timestamp);
      // The callback may have unmounted us synchronously (e.g. via flushSync).
      if (active) frameId = window.requestAnimationFrame(loop);
    };
    frameId = window.requestAnimationFrame(loop);
    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [paused, callbackRef]);
}
