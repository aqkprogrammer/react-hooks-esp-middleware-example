import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

export interface ObjectUrls {
  /** `URL.createObjectURL` exists (false on the server and in very old browsers). */
  isSupported: boolean;
  /** Creates a `blob:` URL for `blob` and tracks it; `null` when unsupported or it throws. */
  create: (blob: Blob) => string | null;
  /** Revokes a URL created by `create` (no-op for unknown URLs). */
  revoke: (url: string | null) => void;
}

const subscribeNever = () => () => {};
const detect = () => typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
const serverFalse = () => false;

/**
 * Creates object URLs **in event handlers** (never during render, which must
 * stay pure) and guarantees every URL is revoked: on `revoke`, and for any
 * URL still alive when the component unmounts. Each un-revoked URL keeps the
 * whole file in memory until the document is unloaded.
 */
export function useObjectUrls(): ObjectUrls {
  const isSupported = useSyncExternalStore(subscribeNever, detect, serverFalse);
  const live = useRef(new Set<string>());

  useEffect(() => {
    const urls = live.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const create = useCallback((blob: Blob) => {
    if (!detect()) return null;
    try {
      const url = URL.createObjectURL(blob);
      live.current.add(url);
      return url;
    } catch {
      return null;
    }
  }, []);

  const revoke = useCallback((url: string | null) => {
    if (!url || !live.current.has(url)) return;
    live.current.delete(url);
    URL.revokeObjectURL(url);
  }, []);

  return { isSupported, create, revoke };
}
