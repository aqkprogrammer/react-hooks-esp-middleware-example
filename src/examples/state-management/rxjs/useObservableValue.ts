import { useCallback, useSyncExternalStore } from 'react';

/** Anything with a current value and change notifications, e.g. an RxJS `BehaviorSubject`. */
export interface ValueSource<T> {
  getValue(): T;
  subscribe(next: (value: T) => void): { unsubscribe(): void };
}

/**
 * Reads a `BehaviorSubject`-like source with `useSyncExternalStore`: no
 * `useEffect` + `setState` copy of the value, no tearing, and the
 * subscription is removed on unmount. Structural typing keeps RxJS out of
 * this hook's imports.
 */
export function useObservableValue<T>(source: ValueSource<T>): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const subscription = source.subscribe(onChange);
      return () => subscription.unsubscribe();
    },
    [source],
  );
  const getSnapshot = useCallback(() => source.getValue(), [source]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
