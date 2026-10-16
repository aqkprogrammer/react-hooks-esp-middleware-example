import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStorageValue } from './storageState';
import { useBroadcastChannel } from './useBroadcastChannel';

export interface UseCrossTabStateOptions<T> {
  /** Guards values received from other tabs (which may run an older app version). */
  validate?: (value: unknown) => value is T;
  /** Unclonable values or invalid messages. */
  onError?: (error: Error) => void;
}

/** Last-writer-wins ordering: wall-clock time, then tab id to break ties. */
interface Stamp {
  at: number;
  tab: string;
}

type Message<T> =
  | { type: 'set'; value: T; stamp: Stamp }
  | { type: 'reply'; value: T; stamp: Stamp }
  | { type: 'request' };

const isNewer = (candidate: Stamp, current: Stamp | null) =>
  current === null ||
  candidate.at > current.at ||
  (candidate.at === current.at && candidate.tab > current.tab);

const createTabId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const isMessage = (data: unknown): data is Message<unknown> =>
  typeof data === 'object' &&
  data !== null &&
  ['set', 'reply', 'request'].includes((data as { type?: unknown }).type as string);

/**
 * `useState` shared live between all open tabs of the same origin through a
 * `BroadcastChannel` — **without persisting anything**.
 *
 * ```tsx
 * const [presenting, setPresenting] = useCrossTabState('slides:current', 0);
 * ```
 *
 * When to choose it over `useLocalStorage`:
 * - The state should vanish when the last tab closes (a "follow along"
 *   cursor, the current slide, a temporary filter shared by two windows).
 * - Nothing is written to disk and there is no ~5 MB quota or string
 *   serialisation: values are structured-cloned, so `Map`, `Set` and `Date` survive.
 *
 * How it works: a newly opened tab asks the others for the current value
 * (`request` → `reply`); updates are broadcast as `set`. Conflicts resolve
 * last-writer-wins by timestamp, so all tabs converge on the same value.
 *
 * Caveats: other same-origin scripts can listen to the channel, so do not
 * send secrets; without `BroadcastChannel` (and on the server) it behaves
 * like plain `useState`.
 */
export function useCrossTabState<T>(
  channelName: string,
  initialValue: T | (() => T),
  options: UseCrossTabStateOptions<T> = {},
): readonly [value: T, setValue: SetStorageValue<T>] {
  const [store, setStore] = useState<{ value: T; stamp: Stamp | null }>(() => ({
    value: typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue,
    stamp: null,
  }));
  // Mirrors `store` for event handlers, which must compare against the
  // newest value even before React re-renders. Written only in handlers.
  const storeRef = useRef(store);
  const tabIdRef = useRef<string | null>(null);
  const { validate, onError } = options;

  const accept = (value: T, stamp: Stamp) => {
    if (!isNewer(stamp, storeRef.current.stamp)) return;
    const next = { value, stamp };
    storeRef.current = next;
    setStore(next);
  };

  const { postMessage } = useBroadcastChannel<Message<T>>(channelName, {
    validate: (data): data is Message<T> =>
      isMessage(data) && (data.type === 'request' || !validate || validate(data.value)),
    onError,
    onMessage: (message) => {
      if (message.type === 'request') {
        const current = storeRef.current;
        if (current.stamp)
          postMessage({ type: 'reply', value: current.value, stamp: current.stamp });
        return;
      }
      accept(message.value, message.stamp);
    },
  });

  // Ask already-open tabs for the current value. Runs after
  // useBroadcastChannel's effect (declared earlier), so the channel exists.
  useEffect(() => {
    postMessage({ type: 'request' });
  }, [channelName, postMessage]);

  const setValue = useCallback<SetStorageValue<T>>(
    (next) => {
      const previous = storeRef.current.value;
      const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      tabIdRef.current ??= createTabId();
      // Strictly increasing, even for two updates in the same millisecond.
      const at = Math.max(Date.now(), (storeRef.current.stamp?.at ?? 0) + 1);
      const stamp: Stamp = { at, tab: tabIdRef.current };
      storeRef.current = { value, stamp };
      setStore(storeRef.current);
      postMessage({ type: 'set', value, stamp });
    },
    [postMessage],
  );

  return [store.value, setValue] as const;
}
