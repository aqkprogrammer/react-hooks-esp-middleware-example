import { useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

/** Which browser API the reading came from. */
export type OrientationSource = 'screen-orientation' | 'media-query' | 'none';

export interface OrientationState {
  /** `true` when either the Screen Orientation API or `matchMedia` is available. */
  isSupported: boolean;
  /** Where the values come from; `none` on the server and in unsupported browsers. */
  source: OrientationSource;
  /**
   * `portrait-primary`, `landscape-secondary`, … With the `matchMedia`
   * fallback only `portrait-primary`/`landscape-primary` can be detected.
   * `null` on the server and when unsupported.
   */
  type: OrientationType | null;
  /** Rotation angle in degrees (0, 90, 180, 270). `null` when only the media-query fallback is available. */
  angle: number | null;
  /** Convenience: `type` starts with `portrait`. */
  isPortrait: boolean;
  /** Convenience: `type` starts with `landscape`. */
  isLandscape: boolean;
}

const PORTRAIT_QUERY = '(orientation: portrait)';

function getScreenOrientation(): ScreenOrientation | null {
  if (!isBrowser || typeof screen === 'undefined') return null;
  // Typed as always present in lib.dom, but missing in older Safari and jsdom.
  const orientation = (screen as Partial<Screen>).orientation;
  return orientation && typeof orientation.addEventListener === 'function' ? orientation : null;
}

const hasMatchMedia = () => isBrowser && typeof window.matchMedia === 'function';

function getSource(): OrientationSource {
  if (getScreenOrientation()) return 'screen-orientation';
  if (hasMatchMedia()) return 'media-query';
  return 'none';
}

function subscribe(onChange: () => void): () => void {
  const orientation = getScreenOrientation();
  if (orientation) {
    orientation.addEventListener('change', onChange);
    return () => orientation.removeEventListener('change', onChange);
  }
  if (hasMatchMedia()) {
    const list = window.matchMedia(PORTRAIT_QUERY);
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    // Safari < 14 only implements the deprecated listener API.
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }
  return noop;
}

// Snapshots are primitives, so React can compare them with Object.is.
function getTypeSnapshot(): OrientationType | null {
  const orientation = getScreenOrientation();
  if (orientation) return orientation.type;
  if (hasMatchMedia()) {
    return window.matchMedia(PORTRAIT_QUERY).matches ? 'portrait-primary' : 'landscape-primary';
  }
  return null;
}

function getAngleSnapshot(): number | null {
  return getScreenOrientation()?.angle ?? null;
}

const getServerSource = (): OrientationSource => 'none';
const getServerNull = () => null;

/**
 * Tracks the screen orientation.
 *
 * Uses the Screen Orientation API (`screen.orientation` + its `change`
 * event) where available — every modern browser, Safari since 16.4 — and
 * falls back to the `(orientation: portrait)` media query elsewhere. The
 * media query compares the *viewport* aspect ratio, so a narrow desktop window
 * reports "portrait" too, and no angle is available.
 *
 * SSR-safe: the server renders `type: null`, `source: 'none'`. No permission
 * is needed. Locking the orientation (`screen.orientation.lock()`) is not
 * wrapped here: it only works in fullscreen on some mobile browsers.
 */
export function useOrientation(): OrientationState {
  const source = useSyncExternalStore(subscribe, getSource, getServerSource);
  const type = useSyncExternalStore(subscribe, getTypeSnapshot, getServerNull);
  const angle = useSyncExternalStore(subscribe, getAngleSnapshot, getServerNull);
  return {
    isSupported: source !== 'none',
    source,
    type,
    angle,
    isPortrait: type?.startsWith('portrait') ?? false,
    isLandscape: type?.startsWith('landscape') ?? false,
  };
}
