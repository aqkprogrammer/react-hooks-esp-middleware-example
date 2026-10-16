import { webStorageAdapter, type PersistenceAdapter } from '../../../hooks';
import { PREFERENCES_KEY } from './preferences';

const local = webStorageAdapter('local');
const writeListeners = new Set<() => void>();

/**
 * localStorage with a write tap, so the demo can show the raw stored JSON.
 * A custom adapter is just an object with getItem/setItem/removeItem and an
 * optional subscribe — the same shape a namespaced, encrypted or native
 * bridge adapter would have. Defined once at module level (stable identity).
 */
export const preferencesAdapter: PersistenceAdapter = {
  getItem: (key) => local.getItem(key),
  setItem: (key, value) => {
    local.setItem(key, value);
    writeListeners.forEach((listener) => listener());
  },
  removeItem: (key) => {
    local.removeItem(key);
    writeListeners.forEach((listener) => listener());
  },
  // Other tabs: the `storage` event, via the built-in adapter.
  subscribe: (key, onChange) => local.subscribe?.(key, onChange) ?? (() => {}),
};

/** `useSyncExternalStore` subscription for the raw stored string. */
export function subscribeRawPreferences(onChange: () => void): () => void {
  writeListeners.add(onChange);
  const unsubscribe = preferencesAdapter.subscribe?.(PREFERENCES_KEY, onChange);
  return () => {
    writeListeners.delete(onChange);
    unsubscribe?.();
  };
}

export function readRawPreferences(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return preferencesAdapter.getItem(PREFERENCES_KEY);
  } catch {
    return null;
  }
}

/** Writes exactly what an older (or newer) release would have stored, then tells subscribers. */
export function writeRawPreferences(raw: string): void {
  window.localStorage.setItem(PREFERENCES_KEY, raw);
  // The `storage` event normally comes from another tab; dispatching it here
  // makes every subscriber re-read the key, exactly as after a real upgrade.
  window.dispatchEvent(new StorageEvent('storage', { key: PREFERENCES_KEY }));
}
