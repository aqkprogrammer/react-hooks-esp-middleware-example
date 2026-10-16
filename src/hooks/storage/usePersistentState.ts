import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';
import { useLatest } from '../state/useLatest';
import {
  getWebStorage,
  type SetStorageValue,
  type StorageErrorKind,
  type StorageKind,
  type StorageStateResult,
} from './storageState';

/**
 * Where `usePersistentState` keeps its data. The `Storage` interface
 * (`localStorage`, `sessionStorage`) already fits; so does a memory map, a
 * namespaced or encrypted wrapper, or a bridge to a native host.
 *
 * Methods are synchronous and may throw (quota, blocked storage); the hook
 * catches and reports. Define adapters at module level so their identity is stable.
 */
export interface PersistenceAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  /** Optional: notify when `key` changes outside this page (e.g. the `storage` event). */
  subscribe?: (key: string, onChange: () => void) => () => void;
}

export type PersistentStateErrorKind = StorageErrorKind | 'migrate' | 'version';

export interface PersistentStateError {
  kind: PersistentStateErrorKind;
  key: string;
  error: unknown;
}

export interface UsePersistentStateOptions<T> {
  adapter: PersistenceAdapter;
  /** Schema version of `T`. Bump it when the shape changes. Default `1`. */
  version?: number;
  /**
   * Upgrades data written by an older version. Receives the old value and its
   * version (`0` for data written without the versioned envelope, e.g. by
   * plain `localStorage.setItem`) and returns a value for the current
   * version. The upgraded value is written back once. Keep it (and
   * `validate`) stable — define them at module level.
   */
  migrate?: (oldValue: unknown, oldVersion: number) => unknown;
  /** Runtime guard applied after migration. Failures fall back to `initialValue`. */
  validate?: (value: unknown) => value is T;
  onError?: (error: PersistentStateError) => void;
}

interface Envelope {
  __v: number;
  value: unknown;
}

const isEnvelope = (value: unknown): value is Envelope =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Envelope).__v === 'number' &&
  'value' in value;

type Decoded<T> =
  { ok: true; value: T; migrated: boolean } | { ok: false; error?: PersistentStateError };

/** Same-tab notifications, scoped per adapter instance. */
const listeners = new WeakMap<PersistenceAdapter, Map<string, Set<() => void>>>();

function notify(adapter: PersistenceAdapter, key: string) {
  listeners
    .get(adapter)
    ?.get(key)
    ?.forEach((listener) => listener());
}

/** A `Map`-backed adapter: per page load, never persisted. Handy for tests and fallbacks. */
export function createMemoryAdapter(): PersistenceAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

const webAdapters: Partial<Record<StorageKind, PersistenceAdapter>> = {};

/**
 * A stable adapter for `localStorage` / `sessionStorage`. SSR-safe (reads
 * return `null` on the server) and notifies on writes from other tabs.
 */
export function webStorageAdapter(kind: StorageKind): PersistenceAdapter {
  const existing = webAdapters[kind];
  if (existing) return existing;
  const storage = () => {
    const resolved = getWebStorage(kind);
    if (!resolved) throw new DOMException(`${kind}Storage is unavailable`, 'SecurityError');
    return resolved;
  };
  const adapter: PersistenceAdapter = {
    getItem: (key) => (isBrowser ? storage().getItem(key) : null),
    setItem: (key, value) => storage().setItem(key, value),
    removeItem: (key) => storage().removeItem(key),
    subscribe(key, onChange) {
      if (!isBrowser) return noop;
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) onChange();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
  webAdapters[kind] = adapter;
  return adapter;
}

/**
 * Persistent state with a pluggable storage adapter and **schema versioning**.
 *
 * ```tsx
 * const [prefs, setPrefs] = usePersistentState('prefs', { theme: 'light', fontSize: 14 }, {
 *   adapter: webStorageAdapter('local'),
 *   version: 2,
 *   migrate: (old, from) => (from < 2 ? { ...(old as V1), fontSize: 14 } : old),
 *   validate: isPrefs,
 * });
 * ```
 *
 * How it differs from `useLocalStorage`:
 * - Storage-agnostic: any synchronous {@link PersistenceAdapter}.
 * - Values are stored in an envelope `{"__v": version, "value": …}`. Older
 *   data runs through `migrate` once and is written back; data from a
 *   *newer* version (after a rollback) is ignored with `onError({ kind: 'version' })`
 *   rather than misread.
 * - Cross-tab sync only if the adapter implements `subscribe`.
 *
 * Use `useLocalStorage` for simple preferences; reach for this when the
 * stored shape will evolve across releases or the backend is not Web Storage.
 * Values must be JSON-serialisable. Never persist secrets or tokens: any
 * script on the origin can read browser storage.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
  options: UsePersistentStateOptions<T>,
): StorageStateResult<T> {
  const { adapter, version = 1, migrate, validate } = options;
  const onErrorRef = useLatest(options.onError);
  const [initial] = useState(initialValue);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const byKey = listeners.get(adapter) ?? new Map<string, Set<() => void>>();
      listeners.set(adapter, byKey);
      const set = byKey.get(key) ?? new Set();
      byKey.set(key, set);
      set.add(onChange);
      const unsubscribeExternal = adapter.subscribe?.(key, onChange) ?? noop;
      return () => {
        set.delete(onChange);
        if (set.size === 0) byKey.delete(key);
        unsubscribeExternal();
      };
    },
    [adapter, key],
  );

  const raw = useSyncExternalStore(
    subscribe,
    () => readRawFrom(adapter, key),
    () => null,
  );

  const decode = useCallback(
    (rawValue: string | null): Decoded<T> => {
      if (rawValue === null) return { ok: false };
      let parsed: unknown;
      let legacy = false;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        // Not JSON at all: treat it as a version-0 raw string.
        parsed = rawValue;
        legacy = true;
      }
      let storedVersion = 0;
      let value: unknown = parsed;
      if (!legacy && isEnvelope(parsed)) {
        storedVersion = parsed.__v;
        value = parsed.value;
      }
      if (storedVersion > version) {
        const error = new RangeError(
          `Stored "${key}" has version ${storedVersion}, newer than ${version}`,
        );
        return { ok: false, error: { kind: 'version', key, error } };
      }
      let migrated = false;
      if (storedVersion < version) {
        if (!migrate) {
          const error = new RangeError(
            `Stored "${key}" has version ${storedVersion}; no migrate()`,
          );
          return { ok: false, error: { kind: 'version', key, error } };
        }
        try {
          value = migrate(value, storedVersion);
          migrated = true;
        } catch (error) {
          return { ok: false, error: { kind: 'migrate', key, error } };
        }
      }
      if (validate && !validate(value)) {
        const error = new TypeError(`Stored value for "${key}" failed validation`);
        return { ok: false, error: { kind: 'invalid', key, error } };
      }
      return { ok: true, value: value as T, migrated };
    },
    [key, version, validate, migrate],
  );

  const decoded = useMemo(() => decode(raw), [decode, raw]);
  const value = decoded.ok ? decoded.value : initial;

  const write = useCallback(
    (next: T): boolean => {
      let serialized: string;
      try {
        serialized = JSON.stringify({ __v: version, value: next } satisfies Envelope);
      } catch (error) {
        onErrorRef.current?.({ kind: 'serialize', key, error });
        return false;
      }
      try {
        adapter.setItem(key, serialized);
      } catch (error) {
        onErrorRef.current?.({ kind: 'write', key, error });
        return false;
      }
      notify(adapter, key);
      return true;
    },
    [adapter, key, version, onErrorRef],
  );

  // Report problems and persist migrations after commit, never during render.
  const decodeError = decoded.ok ? undefined : decoded.error;
  useEffect(() => {
    if (decodeError) onErrorRef.current?.(decodeError);
  }, [decodeError, onErrorRef]);

  const migratedValue = decoded.ok && decoded.migrated ? decoded.value : undefined;
  const needsWriteBack = decoded.ok && decoded.migrated;
  useEffect(() => {
    if (needsWriteBack) write(migratedValue as T);
  }, [needsWriteBack, migratedValue, write]);

  const setValue = useCallback<SetStorageValue<T>>(
    (next) => {
      const current = decode(readRawFrom(adapter, key));
      const previous = current.ok ? current.value : initial;
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      write(resolved);
    },
    [adapter, key, decode, initial, write],
  );

  const remove = useCallback(() => {
    try {
      adapter.removeItem(key);
    } catch (error) {
      onErrorRef.current?.({ kind: 'write', key, error });
    }
    notify(adapter, key);
  }, [adapter, key, onErrorRef]);

  return [value, setValue, remove] as const;
}

function readRawFrom(adapter: PersistenceAdapter, key: string): string | null {
  try {
    return adapter.getItem(key);
  } catch {
    return null;
  }
}
