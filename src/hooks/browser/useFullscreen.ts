import { useCallback, useState, useSyncExternalStore } from 'react';
import { isBrowser, noop, toError } from '../internal/env';
import { useIsSupported } from './shared';

/** Safari before 16.4 (macOS/iPadOS) only implements the `webkit`-prefixed API. */
interface PrefixedDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface PrefixedElement extends Element {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
}

export interface UseFullscreenOptions {
  /** Passed to `requestFullscreen`, e.g. `{ navigationUI: 'hide' }`. */
  fullscreenOptions?: FullscreenOptions;
}

export interface UseFullscreenResult<T extends Element> {
  /** Callback ref for the element to show full screen. */
  ref: (node: T | null) => void;
  /** `true` while *this* element is the document's fullscreen element. */
  isFullscreen: boolean;
  /**
   * `document.fullscreenEnabled`: `false` on the server, in browsers without
   * the API (iPhone Safari for non-video elements) and in iframes without
   * `allow="fullscreen"`.
   */
  isSupported: boolean;
  /** Must be called from a user gesture (click, key press). Never rejects; see `error`. */
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
  /** The last failure (no user activation, denied by permissions policy, unsupported). */
  error: Error | null;
}

function getDocument(): PrefixedDocument | null {
  return isBrowser ? (document as PrefixedDocument) : null;
}

function getFullscreenElement(): Element | null {
  const doc = getDocument();
  if (!doc) return null;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

const supportsFullscreen = () => {
  const doc = getDocument();
  return Boolean(doc && (doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled));
};

function subscribe(onChange: () => void) {
  const doc = getDocument();
  if (!doc) return noop;
  doc.addEventListener('fullscreenchange', onChange);
  doc.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    doc.removeEventListener('fullscreenchange', onChange);
    doc.removeEventListener('webkitfullscreenchange', onChange);
  };
}

const getServerSnapshot = () => null;

/**
 * Shows an element full screen with the Fullscreen API.
 *
 * ```tsx
 * const { ref, isFullscreen, isSupported, toggle } = useFullscreen<HTMLDivElement>();
 * <div ref={ref}>…<button onClick={toggle} disabled={!isSupported}>Full screen</button></div>
 * ```
 *
 * - `isFullscreen` comes from `useSyncExternalStore` over `fullscreenchange`,
 *   so it is also correct when the user leaves with Esc or the browser UI.
 * - Uses the standard API and falls back to the `webkit` prefix (Safari < 16.4).
 * - Errors are captured in `error` instead of rejecting: `requestFullscreen`
 *   fails without transient user activation, inside iframes without
 *   `allow="fullscreen"`, and on iPhone (Safari only supports video there).
 */
export function useFullscreen<T extends Element = HTMLElement>(
  options: UseFullscreenOptions = {},
): UseFullscreenResult<T> {
  const { fullscreenOptions } = options;
  const [element, setElement] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = useIsSupported(supportsFullscreen);
  const fullscreenElement = useSyncExternalStore(
    subscribe,
    getFullscreenElement,
    getServerSnapshot,
  );
  const isFullscreen = element !== null && fullscreenElement === element;
  const navigationUI = fullscreenOptions?.navigationUI;

  const enter = useCallback(async () => {
    const target = element as PrefixedElement | null;
    if (!target) return;
    try {
      if (typeof target.requestFullscreen === 'function') {
        await target.requestFullscreen(navigationUI ? { navigationUI } : undefined);
      } else if (typeof target.webkitRequestFullscreen === 'function') {
        await target.webkitRequestFullscreen();
      } else {
        throw new DOMException('The Fullscreen API is not supported', 'NotSupportedError');
      }
      setError(null);
    } catch (caught) {
      setError(toError(caught));
    }
  }, [element, navigationUI]);

  const exit = useCallback(async () => {
    const doc = getDocument();
    // exitFullscreen() rejects when nothing is full screen.
    if (!doc || getFullscreenElement() === null) return;
    try {
      if (typeof doc.exitFullscreen === 'function') await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
      setError(null);
    } catch (caught) {
      setError(toError(caught));
    }
  }, []);

  const toggle = useCallback(
    () => (element !== null && getFullscreenElement() === element ? exit() : enter()),
    [element, enter, exit],
  );

  const ref = useCallback((node: T | null) => setElement(node), []);
  return { ref, isFullscreen, isSupported, enter, exit, toggle, error };
}
