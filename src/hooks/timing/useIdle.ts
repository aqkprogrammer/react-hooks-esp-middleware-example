import { useCallback, useEffect, useRef, useState } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';

/** Events that count as user activity by default. */
export const DEFAULT_IDLE_EVENTS: readonly string[] = [
  'pointermove',
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
];

export interface UseIdleOptions {
  /** Window events that count as activity. Default `DEFAULT_IDLE_EVENTS`. */
  events?: readonly string[];
  /** Idle state before any activity is observed (and on the server). Default `false`. */
  initialState?: boolean;
  /** Called when the user becomes idle. */
  onIdle?: () => void;
  /** Called when an idle user becomes active again. */
  onActive?: () => void;
}

export interface UseIdleReturn {
  isIdle: boolean;
  /**
   * Timestamp (`Date.now()`) of the last activity — `0` before mount. Not
   * reactive (activity events are too frequent to re-render on), so read it in
   * handlers or a timer.
   */
  getLastActive: () => number;
}

/**
 * Detects when the user has not interacted with the page for `timeoutMs`.
 *
 * - Listens (passive, capture) on `window` for activity events and on
 *   `document` for `visibilitychange`: returning to the tab counts as activity.
 * - Activity only records a timestamp; a single timer re-checks the elapsed
 *   time, so a flood of `pointermove` events does not reset timers or
 *   re-render. The component re-renders only when `isIdle` flips.
 * - SSR-safe: returns `initialState` on the server and subscribes after mount.
 * - Changing `timeoutMs` re-evaluates against the last activity; an idle user
 *   stays idle until the next activity.
 */
export function useIdle(timeoutMs: number, options: UseIdleOptions = {}): UseIdleReturn {
  const { events = DEFAULT_IDLE_EVENTS, initialState = false, onIdle, onActive } = options;
  const [isIdle, setIsIdle] = useState(initialState);
  const idleRef = useRef(initialState);
  const lastActiveRef = useRef(0);
  const onIdleRef = useLatest(onIdle);
  const onActiveRef = useLatest(onActive);
  // Subscribe by content, not identity, so inline arrays do not re-subscribe.
  const eventsKey = events.join(' ');

  useEffect(() => {
    if (!isBrowser) return;
    const eventNames = eventsKey.split(' ').filter(Boolean);
    const timeout = Math.max(0, timeoutMs);
    if (lastActiveRef.current === 0) lastActiveRef.current = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      timer = undefined;
      const remaining = timeout - (Date.now() - lastActiveRef.current);
      if (remaining > 0) {
        timer = setTimeout(check, remaining);
      } else if (!idleRef.current) {
        idleRef.current = true;
        setIsIdle(true);
        onIdleRef.current?.();
      }
    };

    const onActivity = () => {
      lastActiveRef.current = Date.now();
      if (idleRef.current) {
        idleRef.current = false;
        setIsIdle(false);
        onActiveRef.current?.();
      }
      timer ??= setTimeout(check, timeout);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onActivity();
    };

    const listenerOptions: AddEventListenerOptions = { passive: true, capture: true };
    for (const name of eventNames) window.addEventListener(name, onActivity, listenerOptions);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!idleRef.current) {
      timer = setTimeout(check, Math.max(0, timeout - (Date.now() - lastActiveRef.current)));
    }

    return () => {
      for (const name of eventNames) window.removeEventListener(name, onActivity, listenerOptions);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [eventsKey, timeoutMs, onIdleRef, onActiveRef]);

  const getLastActive = useCallback(() => lastActiveRef.current, []);
  return { isIdle, getLastActive };
}
