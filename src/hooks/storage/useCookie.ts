import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';
import { useLatest } from '../state/useLatest';

export interface CookieOptions {
  /** Default `'/'` so the cookie is visible on every page. */
  path?: string;
  /** Omit to scope the cookie to the current host only (safest). */
  domain?: string;
  /** Lifetime in seconds. Takes precedence over `expires`. Omit both for a session cookie. */
  maxAge?: number;
  expires?: Date;
  /** Default `'lax'`. `'none'` always adds `Secure` (browsers reject it otherwise). */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Only send over HTTPS. Default `true` on https pages, `false` on http (e.g. localhost). */
  secure?: boolean;
}

export type CookieErrorKind = 'unavailable' | 'write';

export interface CookieError {
  kind: CookieErrorKind;
  name: string;
  error: Error;
}

export interface UseCookieOptions extends CookieOptions {
  /**
   * Rendered on the server and during hydration. Pass the value your server
   * read from the request's `Cookie` header so the HTML matches. Default `null`.
   */
  serverValue?: string | null;
  /** Cookies disabled, or the browser silently rejected a write (e.g. > 4 KB). */
  onError?: (error: CookieError) => void;
}

export type UseCookieResult = readonly [
  value: string | null,
  setCookie: (value: string, options?: CookieOptions) => boolean,
  removeCookie: (options?: Pick<CookieOptions, 'path' | 'domain'>) => void,
];

/** Parses a `document.cookie` string. Malformed percent-encoding is returned raw. */
export function parseCookies(cookieString: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieString.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = safeDecode(part.slice(0, index).trim());
    if (name && !(name in result)) result[name] = safeDecode(part.slice(index + 1).trim());
  }
  return result;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Builds a `Set-Cookie`-style string for `document.cookie`. Name and value are
 * `encodeURIComponent`-encoded, so `;`, `=` and spaces cannot inject attributes.
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const { path = '/', domain, maxAge, expires, sameSite = 'lax' } = options;
  const secure = sameSite === 'none' || (options.secure ?? false);
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (domain) parts.push(`Domain=${domain}`);
  if (maxAge !== undefined) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  else if (expires) parts.push(`Expires=${expires.toUTCString()}`);
  parts.push(`SameSite=${sameSite[0]?.toUpperCase()}${sameSite.slice(1)}`);
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

const CHANGE_EVENT = 'react-hooks-playground:cookie';

function readCookie(name: string): string | null {
  if (!isBrowser) return null;
  return parseCookies(document.cookie)[name] ?? null;
}

function cookiesEnabled(): boolean {
  return isBrowser && navigator.cookieEnabled !== false;
}

function subscribe(onChange: () => void): () => void {
  if (!isBrowser) return noop;
  const onVisible = () => {
    if (document.visibilityState === 'visible') onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  // Other tabs and HTTP responses can change cookies too. The Cookie Store
  // API reports that where supported; elsewhere re-read when the tab regains focus.
  const store = 'cookieStore' in window ? window.cookieStore : undefined;
  store?.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    store?.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/**
 * Reads, writes and removes one cookie through `document.cookie`, and keeps
 * every component using the same cookie name in sync.
 *
 * ```tsx
 * const [consent, setConsent, clearConsent] = useCookie('consent', { maxAge: 60 * 60 * 24 * 180 });
 * ```
 *
 * - Built on `useSyncExternalStore`; renders `serverValue` on the server.
 * - Options passed to the hook are defaults for every write; `setCookie`
 *   can override them per call. Removal must use the same `path`/`domain`.
 * - Browsers drop invalid writes silently (over ~4 KB, `Secure` on http,
 *   a foreign `domain`). The hook reads the cookie back and reports
 *   `onError({ kind: 'write' })` and returns `false` when that happens.
 *
 * Security: JavaScript can only see cookies **without** `HttpOnly`, and so
 * can any injected script. Session and auth cookies must be `HttpOnly`,
 * `Secure` and `SameSite` — set by the server, never by this hook. Use it for
 * preferences such as consent, locale or theme.
 */
export function useCookie(name: string, options: UseCookieOptions = {}): UseCookieResult {
  const { serverValue = null, onError, ...defaults } = options;
  const defaultsRef = useLatest(defaults);
  const onErrorRef = useLatest(onError);

  const value = useSyncExternalStore(
    subscribe,
    () => readCookie(name),
    () => serverValue,
  );

  useEffect(() => {
    if (isBrowser && !cookiesEnabled()) {
      onErrorRef.current?.({ kind: 'unavailable', name, error: new Error('Cookies are disabled') });
    }
  }, [name, onErrorRef]);

  const setCookie = useCallback(
    (next: string, overrides: CookieOptions = {}) => {
      if (!cookiesEnabled()) {
        onErrorRef.current?.({
          kind: 'unavailable',
          name,
          error: new Error('Cookies are disabled'),
        });
        return false;
      }
      const merged: CookieOptions = {
        secure: window.location.protocol === 'https:',
        ...defaultsRef.current,
        ...overrides,
      };
      document.cookie = serializeCookie(name, next, merged);
      window.dispatchEvent(new Event(CHANGE_EVENT));

      // Only verify when the cookie should be visible from this page.
      const path = merged.path ?? '/';
      const expired = merged.maxAge !== undefined && merged.maxAge <= 0;
      const visibleHere = !merged.domain && window.location.pathname.startsWith(path);
      if (visibleHere && !expired && readCookie(name) !== next) {
        onErrorRef.current?.({
          kind: 'write',
          name,
          error: new Error(
            `The browser rejected cookie "${name}" (too large or invalid attributes)`,
          ),
        });
        return false;
      }
      return true;
    },
    [name, defaultsRef, onErrorRef],
  );

  const removeCookie = useCallback(
    (overrides: Pick<CookieOptions, 'path' | 'domain'> = {}) => {
      if (!isBrowser) return;
      const { path, domain } = { ...defaultsRef.current, ...overrides };
      document.cookie = serializeCookie(name, '', { path, domain, maxAge: 0 });
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [name, defaultsRef],
  );

  return [value, setCookie, removeCookie] as const;
}
