import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { useLatest } from '../state/useLatest';

export interface UseDoubleClickOptions<T extends Element = Element> {
  /** Runs when a click is *not* followed by a second one within `delay`. */
  onSingleClick?: (event: MouseEvent<T>) => void;
  /** Runs on the second click within `delay` (the pending single click is dropped). */
  onDoubleClick?: (event: MouseEvent<T>) => void;
  /** Max ms between the two clicks. Default `250`. */
  delay?: number;
}

export interface UseDoubleClickReturn<T extends Element = Element> {
  /** Spread or pass to the element's `onClick`. Stable identity. */
  onClick: (event: MouseEvent<T>) => void;
  /** Drops a pending single click. */
  cancel: () => void;
}

/**
 * Distinguishes a single click from a double click on the same element.
 *
 * A single click is only reported after `delay` ms without a second click —
 * that is the unavoidable cost of telling them apart. The native `dblclick`
 * event cannot do this because the first `click` has already fired.
 *
 * Works for keyboard activation too (Enter/Space on a button dispatch
 * `click`). **Accessibility**: double-click is hard for many users (motor
 * impairments, touch screens, screen readers) — never make it the *only* way
 * to perform an action; offer a button or menu item as well.
 *
 * The pending timer is cleared on unmount.
 */
export function useDoubleClick<T extends Element = Element>(
  options: UseDoubleClickOptions<T>,
): UseDoubleClickReturn<T> {
  const optionsRef = useLatest(options);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useMemo<UseDoubleClickReturn<T>>(
    () => ({
      onClick: (event) => {
        const { onDoubleClick, delay = 250 } = optionsRef.current;
        if (timerRef.current !== undefined) {
          clearTimeout(timerRef.current);
          timerRef.current = undefined;
          onDoubleClick?.(event);
          return;
        }
        timerRef.current = setTimeout(() => {
          timerRef.current = undefined;
          optionsRef.current.onSingleClick?.(event);
        }, delay);
      },
      cancel: () => {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      },
    }),
    [optionsRef],
  );
}
