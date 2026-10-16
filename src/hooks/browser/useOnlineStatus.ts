import { useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

function subscribe(onChange: () => void) {
  if (!isBrowser) return noop;
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

/**
 * `navigator.onLine` as React state, updated by the `online`/`offline`
 * events through `useSyncExternalStore` (this is the example from the
 * `useSyncExternalStore` docs, made SSR-safe).
 *
 * **`true` does not mean the internet is reachable.** It only means the device
 * has *some* network connection (a LAN without upstream, a captive portal, a
 * VPN that is down all count as online). `false` is reliable: the device is
 * definitely offline. Treat failed requests as the real signal and use this
 * hook for UI hints ("You are offline") and for retrying when it flips back.
 *
 * Server and hydration render: `true`.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
