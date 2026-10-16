/**
 * Browser state exposed as external stores for `useSyncExternalStore`.
 * Each store is three module-level (stable) functions: `subscribe`,
 * `getSnapshot` (client) and `getServerSnapshot` (server render and
 * hydration). Nothing here touches `window` at import time, so the module is
 * safe to load on the server.
 */

// ---- navigator.onLine ------------------------------------------------------

export function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

/** The server cannot know; assume online so the HTML does not show an error. */
export function getOnlineServerSnapshot(): boolean {
  return true;
}

// ---- document.visibilityState ----------------------------------------------

export function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

export function getVisibilitySnapshot(): DocumentVisibilityState {
  return document.visibilityState;
}

export function getVisibilityServerSnapshot(): DocumentVisibilityState {
  return 'visible';
}
