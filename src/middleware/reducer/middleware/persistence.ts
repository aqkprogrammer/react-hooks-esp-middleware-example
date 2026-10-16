import type { Middleware } from '../types';

/** The part of `Storage` persistence needs (localStorage, sessionStorage or a fake). */
export type PersistenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type PersistenceErrorKind = 'unavailable' | 'quota' | 'write' | 'serialize';

export interface PersistenceError {
  kind: PersistenceErrorKind;
  key: string;
  error: unknown;
}

export interface PersistenceOptions<S, P> {
  /** Storage key. Namespace and version it, e.g. `app:cart:v1`. */
  key: string;
  /** Picks the slice to persist. Return the same reference when nothing relevant changed. */
  select: (state: S) => P;
  /**
   * Returns the storage to use, or `null` when there is none. Resolved lazily
   * on every save, so the middleware is safe to create on the server.
   * Defaults to `window.localStorage` (guarded: accessing it can throw).
   */
  getStorage?: () => PersistenceStorage | null;
  /** Wait this long after the last change before writing (default 300 ms). */
  debounceMs?: number;
  /** Defaults to `JSON.stringify`. */
  serialize?: (slice: P) => string;
  /** Called after a successful write. */
  onSaved?: (slice: P) => void;
  /**
   * Called when storage is unavailable, serialisation fails or the write is
   * rejected (`quota` when the browser is out of space). The in-memory state
   * is unaffected; the next change retries. Defaults to `console.warn`.
   */
  onError?: (error: PersistenceError) => void;
}

/** A middleware with controls for the pending debounced write. */
export type PersistenceMiddleware<S, A> = Middleware<S, A> & {
  /** Write the pending slice now (e.g. on `pagehide`). No-op when nothing is pending. */
  flush: () => void;
  /** Drop the pending write (e.g. on unmount, or before "reset and forget"). */
  cancel: () => void;
};

/** `localStorage`, or `null` on the server / when access is blocked. */
export function defaultPersistenceStorage(): PersistenceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Recognises the different ways browsers report a full storage quota. */
export function isQuotaExceededError(error: unknown): boolean {
  if (typeof DOMException === 'undefined' || !(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

/**
 * Saves a slice of the state to storage, debounced, whenever it changes.
 *
 * - Runs after `next(action)`, so it only ever sees committed state.
 * - Compares slices with `Object.is`, so actions that do not touch the slice
 *   never schedule a write.
 * - A burst of actions produces one write with the latest slice.
 * - Create **one per store**: the pending write lives in this instance.
 *
 * Pair it with {@link hydrate} to read the slice back when creating the store.
 */
export function createPersistenceMiddleware<S, A, P>(
  options: PersistenceOptions<S, P>,
): PersistenceMiddleware<S, A> {
  const {
    key,
    select,
    getStorage = defaultPersistenceStorage,
    debounceMs = 300,
    serialize = JSON.stringify,
    onSaved,
    onError = (error) => console.warn('[persistence]', error),
  } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { slice: P } | undefined;
  let lastSlice: { slice: P } | undefined;

  const write = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const { slice } = pending;
    pending = undefined;
    const storage = getStorage();
    if (!storage) {
      onError({ kind: 'unavailable', key, error: new Error('Storage is not available') });
      return;
    }
    let raw: string;
    try {
      raw = serialize(slice);
    } catch (error) {
      onError({ kind: 'serialize', key, error });
      return;
    }
    try {
      storage.setItem(key, raw);
    } catch (error) {
      onError({ kind: isQuotaExceededError(error) ? 'quota' : 'write', key, error });
      // Forget what we "saved" so the next change retries even if it
      // produces an equal slice.
      lastSlice = undefined;
      return;
    }
    onSaved?.(slice);
  };

  const middleware: Middleware<S, A> = (api) => {
    lastSlice = { slice: select(api.getState()) };
    return (next) => (action) => {
      next(action);
      const slice = select(api.getState());
      if (lastSlice && Object.is(lastSlice.slice, slice)) return;
      lastSlice = { slice };
      pending = { slice };
      clearTimeout(timer);
      timer = setTimeout(write, debounceMs);
    };
  };

  return Object.assign(middleware, {
    flush: write,
    cancel: () => {
      clearTimeout(timer);
      timer = undefined;
      pending = undefined;
    },
  });
}

export interface HydrateOptions<P> {
  key: string;
  /** Runtime guard: storage is user-editable and may hold data from an older version. */
  validate: (value: unknown) => value is P;
  getStorage?: () => PersistenceStorage | null;
  /** Defaults to `JSON.parse`. */
  deserialize?: (raw: string) => unknown;
  /** Called when the stored value cannot be parsed or fails validation. */
  onError?: (error: { kind: 'parse' | 'invalid'; key: string; error: unknown }) => void;
}

/**
 * Reads a slice saved by {@link createPersistenceMiddleware}. Returns
 * `undefined` when nothing (valid) is stored or storage is unavailable, so it
 * is safe on the server. Merge the result into your initial state:
 *
 * ```ts
 * const saved = hydrate({ key: 'app:cart:v1', validate: isCartItems });
 * const initial = saved ? { ...defaults, items: saved } : defaults;
 * ```
 */
export function hydrate<P>(options: HydrateOptions<P>): P | undefined {
  const { key, validate, getStorage = defaultPersistenceStorage } = options;
  const deserialize = options.deserialize ?? JSON.parse;
  let raw: string | null;
  try {
    raw = getStorage()?.getItem(key) ?? null;
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  let value: unknown;
  try {
    value = deserialize(raw);
  } catch (error) {
    options.onError?.({ kind: 'parse', key, error });
    return undefined;
  }
  if (!validate(value)) {
    options.onError?.({
      kind: 'invalid',
      key,
      error: new TypeError(`Invalid data under "${key}"`),
    });
    return undefined;
  }
  return value;
}
