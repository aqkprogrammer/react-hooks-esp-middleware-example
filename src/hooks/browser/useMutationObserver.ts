import { useEffect, type RefObject } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { useIsSupported } from './shared';

export interface UseMutationObserverResult {
  /** `false` on the server, during hydration and without `MutationObserver`. */
  isSupported: boolean;
}

const supportsMutationObserver = () => isBrowser && typeof window.MutationObserver === 'function';

/**
 * Calls `callback` with batched `MutationRecord`s when the DOM inside
 * `target` changes — for DOM you do not control through React state: third-
 * party widgets, `contenteditable`, attributes set by other scripts.
 *
 * - `target`: a node (element, document, text node…), a ref read when the
 *   effect runs, or `null` to stop observing.
 * - `options` is a standard `MutationObserverInit`. At least one of
 *   `childList`, `attributes` or `characterData` must be enabled (directly or
 *   implied by `attributeFilter`/`*OldValue`), otherwise `observe()` throws a
 *   `TypeError`, which surfaces in the nearest error boundary.
 * - Options are compared by value, so inline object literals are fine.
 * - The latest `callback` is used without re-observing; the observer is
 *   disconnected on unmount or when target/options change. Records still
 *   queued at that moment are discarded.
 *
 * Do not observe DOM that React itself renders in order to react to your own
 * state changes — derive from state instead.
 */
export function useMutationObserver(
  target: Node | RefObject<Node | null> | null,
  callback: (records: MutationRecord[], observer: MutationObserver) => void,
  options: MutationObserverInit,
): UseMutationObserverResult {
  const isSupported = useIsSupported(supportsMutationObserver);
  const callbackRef = useLatest(callback);
  // Serialise to a primitive so a new literal each render does not re-observe.
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    const node = target !== null && 'current' in target ? target.current : target;
    if (!node || !supportsMutationObserver()) return;
    const observer = new MutationObserver((records, instance) =>
      callbackRef.current(records, instance),
    );
    observer.observe(node, JSON.parse(optionsKey) as MutationObserverInit);
    return () => observer.disconnect();
  }, [target, optionsKey, callbackRef]);

  return { isSupported };
}
