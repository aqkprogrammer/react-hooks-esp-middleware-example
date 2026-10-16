import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';
import { useLatest } from '../state/useLatest';

export type StorageKind = 'local' | 'session';

export type StorageErrorKind = 'unavailable' | 'parse' | 'invalid' | 'serialize' | 'write';

export interface StorageError {
  kind: StorageErrorKind;
  key: string;
  error: unknown;
}

export interface StorageStateOptions<T> {
  /**
   * Defaults to `JSON.stringify`. `serialize`, `deserialize` and `validate`
   * should be stable (defined at module level or memoized); a new function on
   * every render re-parses the stored value on every render.
   */
  serialize?: (value: T) => string;
  /** Defaults to `JSON.parse`. */
  deserialize?: (raw: string) => unknown;
  /**
   * Runtime guard for stored data. Storage is user-editable and may contain
   * data written by an older version of your app, so validate it. When the
   * guard fails, the initial value is used and `onError({kind:'invalid'})` fires.
   */
  validate?: (value: unknown) => value is T;
  /** Update when another tab writes the same key (default `true`). */
  syncAcrossTabs?: boolean;
  /** Called for unavailable storage, parse/validation failures and quota errors. */
  onError?: (error: StorageError) => void;
}

export type SetStorageValue<T> = (next: T | ((previous: T) => T)) => void;

export type StorageStateResult<T> = readonly [
  value: T,
  setValue: SetStorageValue<T>,
  remove: () => void,
];

/** Custom event used to notify hooks in the *same* tab (the `storage` event only fires in other tabs). */
const SAME_TAB_EVENT = 'react-hooks-playground:storage';

interface SameTabDetail {
  kind: StorageKind;
  key: string;
}

/**
 * In-memory fallback used when Web Storage is unavailable (disabled cookies,
 * some privacy modes, sandboxed iframes) so the UI keeps working for the
 * lifetime of the page.
 */
const memoryFallback: Record<StorageKind, Map<string, string>> = {
  local: new Map(),
  session: new Map(),
};

const availability: Partial<Record<StorageKind, boolean>> = {};

/** Accessing `window.localStorage` itself can throw (e.g. SecurityError), so probe carefully. */
export function getWebStorage(kind: StorageKind): Storage | null {
  if (!isBrowser) return null;
  if (availability[kind] === false) return null;
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (availability[kind] === undefined) {
      const probe = '__storage_probe__';
      storage.setItem(probe, probe);
      storage.removeItem(probe);
      availability[kind] = true;
    }
    return storage;
  } catch {
    availability[kind] = false;
    return null;
  }
}

/** Test helper: forget cached availability so a new probe runs. */
export function resetStorageAvailability(): void {
  delete availability.local;
  delete availability.session;
  memoryFallback.local.clear();
  memoryFallback.session.clear();
}

function readRaw(kind: StorageKind, key: string): string | null {
  const storage = getWebStorage(kind);
  if (!storage) return memoryFallback[kind].get(key) ?? null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function notifySameTab(kind: StorageKind, key: string) {
  window.dispatchEvent(new CustomEvent<SameTabDetail>(SAME_TAB_EVENT, { detail: { kind, key } }));
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error?: StorageError };

/**
 * Shared implementation behind `useLocalStorage` and `useSessionStorage`.
 *
 * - Reads through `useSyncExternalStore`, so every hook bound to the same key
 *   re-renders together and the server snapshot (`initialValue`) prevents
 *   hydration mismatches.
 * - Writes are synchronous and compute updater functions from the *stored*
 *   value, so two components updating the same key never lose writes.
 */
export function useStorageState<T>(
  kind: StorageKind,
  key: string,
  initialValue: T | (() => T),
  options: StorageStateOptions<T> = {},
): StorageStateResult<T> {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    validate,
    syncAcrossTabs = true,
    onError,
  } = options;

  const onErrorRef = useLatest(onError);

  // Freeze the initial value so a fresh object literal on every render does
  // not produce a new `value` identity on every render.
  const [initial] = useState(initialValue);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser) return noop;
      const onSameTab = (event: Event) => {
        const detail = (event as CustomEvent<SameTabDetail>).detail;
        if (detail.kind === kind && detail.key === key) onStoreChange();
      };
      const onOtherTab = (event: StorageEvent) => {
        // `key === null` means the other tab called `storage.clear()`.
        if (event.key === key || event.key === null) onStoreChange();
      };
      window.addEventListener(SAME_TAB_EVENT, onSameTab);
      if (syncAcrossTabs) window.addEventListener('storage', onOtherTab);
      return () => {
        window.removeEventListener(SAME_TAB_EVENT, onSameTab);
        window.removeEventListener('storage', onOtherTab);
      };
    },
    [kind, key, syncAcrossTabs],
  );

  // Snapshots are raw strings: primitives compare by value, so React does not
  // see a "new" snapshot on every call (which would loop forever).
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(kind, key),
    () => null,
  );

  const parse = useCallback(
    (rawValue: string | null): Parsed<T> => {
      if (rawValue === null) return { ok: false };
      let candidate: unknown;
      try {
        candidate = deserialize(rawValue);
      } catch (error) {
        return { ok: false, error: { kind: 'parse', key, error } };
      }
      if (validate && !validate(candidate)) {
        return {
          ok: false,
          error: {
            kind: 'invalid',
            key,
            error: new TypeError(`Stored value for "${key}" failed validation`),
          },
        };
      }
      return { ok: true, value: candidate as T };
    },
    [deserialize, validate, key],
  );

  const parsed = useMemo(() => parse(raw), [parse, raw]);
  const value = parsed.ok ? parsed.value : initial;

  // Report problems after commit — never as a side effect of rendering.
  const parseError = parsed.ok ? undefined : parsed.error;
  useEffect(() => {
    if (parseError) onErrorRef.current?.(parseError);
  }, [parseError, onErrorRef]);

  useEffect(() => {
    if (isBrowser && getWebStorage(kind) === null) {
      onErrorRef.current?.({
        kind: 'unavailable',
        key,
        error: new Error(`${kind}Storage is unavailable`),
      });
    }
  }, [kind, key, onErrorRef]);

  const setValue = useCallback<SetStorageValue<T>>(
    (next) => {
      const current = parse(readRaw(kind, key));
      const previous = current.ok ? current.value : initial;
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;

      let serialized: string;
      try {
        serialized = serialize(resolved);
      } catch (error) {
        onErrorRef.current?.({ kind: 'serialize', key, error });
        return;
      }

      const storage = getWebStorage(kind);
      if (storage) {
        try {
          storage.setItem(key, serialized);
        } catch (error) {
          // Typically QuotaExceededError. Keep the previous stored value.
          onErrorRef.current?.({ kind: 'write', key, error });
          return;
        }
      } else {
        memoryFallback[kind].set(key, serialized);
      }
      notifySameTab(kind, key);
    },
    [kind, key, parse, initial, serialize, onErrorRef],
  );

  const remove = useCallback(() => {
    const storage = getWebStorage(kind);
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // Removing cannot exceed quota; ignore exotic failures.
      }
    } else {
      memoryFallback[kind].delete(key);
    }
    notifySameTab(kind, key);
  }, [kind, key]);

  return [value, setValue, remove] as const;
}
