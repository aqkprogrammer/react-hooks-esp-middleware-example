import { useDebugValue, useSyncExternalStore } from 'react';
import { getOnlineServerSnapshot, getOnlineSnapshot, subscribeOnline } from './browserStores';

/**
 * Example custom hooks that label themselves in React DevTools with
 * `useDebugValue`. They live with the demo on purpose: the label is only
 * useful for hooks that other people consume (shared libraries).
 */

/** Formatter for `useOnlineStatusDebug` — exported so the demo can preview the label. */
export function formatOnlineStatus(isOnline: boolean): string {
  return isOnline ? 'Online' : 'Offline';
}

/** `navigator.onLine` as a hook; DevTools shows `OnlineStatusDebug: "Online"`. */
export function useOnlineStatusDebug(): boolean {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );
  // The second argument defers formatting until DevTools actually inspects
  // the component, so it costs nothing in normal renders.
  useDebugValue(isOnline, formatOnlineStatus);
  return isOnline;
}

// ---- last user interaction ---------------------------------------------------

let lastInteraction: number | null = null;
const listeners = new Set<() => void>();

function record() {
  lastInteraction = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribeLastInteraction(onChange: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('pointerdown', record, true);
    window.addEventListener('keydown', record, true);
  }
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      window.removeEventListener('pointerdown', record, true);
      window.removeEventListener('keydown', record, true);
    }
  };
}

/** Formatter for `useLastInteractionDebug`: date formatting is the "expensive" part. */
export function formatLastInteraction(timestamp: number | null): string {
  return timestamp === null ? 'no interaction yet' : new Date(timestamp).toLocaleTimeString();
}

/**
 * Epoch milliseconds of the last pointerdown/keydown anywhere on the page, or
 * `null`. DevTools shows the formatted time, e.g. `LastInteractionDebug: "14:03:12"`.
 */
export function useLastInteractionDebug(): number | null {
  const timestamp = useSyncExternalStore(
    subscribeLastInteraction,
    () => lastInteraction,
    () => null,
  );
  useDebugValue(timestamp, formatLastInteraction);
  return timestamp;
}

/** Test helper: forget the recorded interaction. */
export function resetLastInteraction(): void {
  lastInteraction = null;
}
