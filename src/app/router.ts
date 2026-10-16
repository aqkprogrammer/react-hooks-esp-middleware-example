import { useSyncExternalStore } from 'react';

/**
 * A minimal hash router built on `useSyncExternalStore` — itself a small
 * demonstration of subscribing React to a browser source of truth.
 *
 * Hash routing keeps the playground deployable to static hosting (GitHub
 * Pages) without server rewrites. URLs look like `#/entry/use-debounce`.
 */
export interface Location {
  path: string;
  params: URLSearchParams;
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;
const getServerHash = () => '';

export function parseHash(hash: string): Location {
  const raw = hash.replace(/^#/, '') || '/';
  const [path = '/', query = ''] = raw.split('?');
  return { path: path.startsWith('/') ? path : `/${path}`, params: new URLSearchParams(query) };
}

export function useLocation(): Location {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  return parseHash(hash);
}

export function href(path: string, params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return `#${path}${query ? `?${query}` : ''}`;
}

export function navigate(path: string, params?: Record<string, string | undefined>): void {
  window.location.hash = href(path, params).slice(1);
}

/** Replace the current entry (used for filter changes so Back isn't spammed). */
export function replace(path: string, params?: Record<string, string | undefined>): void {
  const url = new URL(window.location.href);
  url.hash = href(path, params);
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
