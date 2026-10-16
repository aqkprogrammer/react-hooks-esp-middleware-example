import { useState } from 'react';
import { useIsomorphicLayoutEffect } from '../internal/useIsomorphicLayoutEffect';
import { useLatest } from '../state/useLatest';
import { toError } from '../internal/env';

/** The observer object passed to `subscribe` (compatible with RxJS's `Observer`). */
export interface ObserverLike<T> {
  next: (value: T) => void;
  error: (error: unknown) => void;
  complete: () => void;
}

/**
 * Anything with an RxJS/TC39-style `subscribe(observer)` method: RxJS
 * `Observable`/`Subject`/`BehaviorSubject`, Redux's `store[Symbol.observable]()`,
 * zen-observable, … No RxJS import needed.
 */
export interface ObservableLike<T> {
  subscribe: (observer: ObserverLike<T>) => { unsubscribe: () => void };
}

export type ObservableStatus = 'waiting' | 'active' | 'error' | 'complete';

export interface ObservableState<T> {
  /** Latest emitted value, or `initialValue` before the first emission. */
  value: T;
  /** `waiting` until the first value, then `active`; `error`/`complete` are terminal. */
  status: ObservableStatus;
  error: Error | null;
}

interface Internal<T> {
  source: ObservableLike<T> | null;
  value: T;
  status: ObservableStatus;
  error: Error | null;
}

/**
 * Subscribes to an observable and returns its latest value.
 *
 * - Subscribes in a layout effect, so synchronous emitters such as a
 *   `BehaviorSubject` (or `of(1)`) are shown before the browser paints — no
 *   flash of `initialValue`. On the server, `initialValue` is rendered.
 * - Unsubscribes on unmount and when `observable` changes; switching sources
 *   resets to `initialValue` without an extra effect.
 * - Errors are captured in `error` (an observable that errors is finished;
 *   pass a new one to retry).
 *
 * **Keep the observable stable** (`useMemo`, module level, or a prop):
 * `pipe(...)` in the render body creates a new observable and re-subscribes on
 * every render.
 */
export function useObservable<T>(
  observable: ObservableLike<T> | null,
  initialValue: T,
): ObservableState<T> {
  const [internal, setInternal] = useState<Internal<T>>({
    source: observable,
    value: initialValue,
    status: 'waiting',
    error: null,
  });

  // Read in the effect only: changing the placeholder must not re-subscribe.
  const initialValueRef = useLatest(initialValue);

  useIsomorphicLayoutEffect(() => {
    if (!observable) return;
    const placeholder = initialValueRef.current;
    let closed = false;
    const settle = (status: 'error' | 'complete', error: Error | null) => {
      if (closed) return;
      setInternal((previous) => ({
        source: observable,
        value: previous.source === observable ? previous.value : placeholder,
        status,
        error,
      }));
    };
    const subscription = observable.subscribe({
      next: (value) => {
        if (!closed) setInternal({ source: observable, value, status: 'active', error: null });
      },
      error: (error) => settle('error', toError(error)),
      complete: () => settle('complete', null),
    });
    return () => {
      closed = true;
      subscription.unsubscribe();
    };
  }, [observable, initialValueRef]);

  // Values from a previous observable are never shown for the new one.
  if (internal.source !== observable) {
    return { value: initialValue, status: 'waiting', error: null };
  }
  return { value: internal.value, status: internal.status, error: internal.error };
}
