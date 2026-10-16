import { useMemo, useState } from 'react';

export interface UseMapActions<K, V> {
  set: (key: K, value: V) => void;
  /** Computes the new value from the current one (`undefined` when the key is absent). */
  update: (key: K, updater: (current: V | undefined) => V) => void;
  remove: (key: K) => void;
  clear: () => void;
  /** Back to the initial entries from the first render. */
  reset: () => void;
}

export type UseMapReturn<K, V> = readonly [map: ReadonlyMap<K, V>, actions: UseMapActions<K, V>];

/**
 * A `Map` in state with immutable updates — every change creates a new `Map`
 * so React sees it, and the returned map is typed `ReadonlyMap`.
 *
 * Setting a key to the value it already holds (`Object.is`), removing an
 * absent key or clearing an empty map keeps the previous instance, so React
 * skips the re-render. Insertion order is preserved; updating an existing key
 * keeps its position.
 */
export function useMap<K, V>(
  initialEntries?: Iterable<readonly [K, V]> | (() => Iterable<readonly [K, V]>),
): UseMapReturn<K, V> {
  const [initial] = useState<ReadonlyMap<K, V>>(() => {
    const source = typeof initialEntries === 'function' ? initialEntries() : initialEntries;
    return new Map(source);
  });
  const [map, setMap] = useState<ReadonlyMap<K, V>>(initial);

  const actions = useMemo<UseMapActions<K, V>>(() => {
    const update = (key: K, updater: (current: V | undefined) => V) =>
      setMap((previous) => {
        const next = updater(previous.get(key));
        if (previous.has(key) && Object.is(previous.get(key), next)) return previous;
        return new Map(previous).set(key, next);
      });
    return {
      set: (key, value) => update(key, () => value),
      update,
      remove: (key) =>
        setMap((previous) => {
          if (!previous.has(key)) return previous;
          const next = new Map(previous);
          next.delete(key);
          return next;
        }),
      clear: () => setMap((previous) => (previous.size ? new Map<K, V>() : previous)),
      reset: () => setMap(initial),
    };
  }, [initial]);

  return [map, actions] as const;
}
