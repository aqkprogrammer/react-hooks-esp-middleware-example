import { useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

function subscribe(onChange: () => void) {
  if (!isBrowser) return noop;
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

const getSnapshot = () => document.visibilityState !== 'hidden';
const getServerSnapshot = () => true;

/**
 * `true` while the page is visible, `false` when the tab is in the background,
 * the window is minimised or the screen is locked — from
 * `document.visibilityState` via `useSyncExternalStore`.
 *
 * Use it to pause polling, animations, video or expensive work in background
 * tabs. Browsers already throttle timers in hidden tabs, but they do not stop
 * your network requests.
 *
 * - Server and hydration render: `true`.
 * - `visibilitychange` → `hidden` is the last event that reliably fires on
 *   mobile before a page is discarded: flush analytics there (with
 *   `navigator.sendBeacon`), not in `unload`.
 */
export function usePageVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
