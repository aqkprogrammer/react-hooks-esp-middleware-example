import { isBrowser } from '../internal/env';
import { useIsomorphicLayoutEffect } from '../internal/useIsomorphicLayoutEffect';

export interface UseScrollLockOptions {
  /**
   * Add the scrollbar's width to `body`'s `padding-right` while locked, so the
   * page does not shift sideways when the scrollbar disappears. Default `true`.
   * Only the first (outermost) lock decides.
   */
  reserveScrollbarGap?: boolean;
}

interface SavedStyles {
  overflow: string;
  paddingRight: string;
}

// Module-level reference count: nested overlays (a dialog opening a
// confirmation) share one lock and only the last unlock restores styles.
let lockCount = 0;
let saved: SavedStyles | null = null;

/** Number of active locks. Exposed for tests and debugging. */
export function getScrollLockCount(): number {
  return lockCount;
}

function lock(reserveScrollbarGap: boolean) {
  lockCount += 1;
  if (lockCount > 1) return;
  const { body, documentElement } = document;
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  // `clientWidth` excludes the scrollbar; 0 means "no layout" (e.g. jsdom).
  const gap =
    documentElement.clientWidth > 0
      ? Math.max(0, window.innerWidth - documentElement.clientWidth)
      : 0;
  if (reserveScrollbarGap && gap > 0) {
    const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + gap}px`;
  }
  body.style.overflow = 'hidden';
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !saved) return;
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
}

/**
 * Prevents the page (`document.body`) from scrolling while `locked` is true —
 * for modals, drawers and full-screen menus.
 *
 * - Sets `overflow: hidden` on `body` and compensates the vanished scrollbar
 *   with extra `padding-right` (scrollbar-gap compensation).
 * - Saves the previous **inline** styles and restores them exactly when the
 *   last lock is released (unmount or `locked` → `false`).
 * - Reference counted: several components may lock at once.
 * - Applied in a layout effect, so there is no frame where the page scrolls
 *   behind a freshly opened overlay. No-op on the server.
 *
 * Caveats: `position: fixed` elements are not padded — use
 * `scrollbar-gutter: stable` on `html` to avoid the shift entirely. iOS Safari
 * before 16 ignores `overflow: hidden` on `body` for touch scrolling.
 */
export function useScrollLock(locked = true, options: UseScrollLockOptions = {}): void {
  const { reserveScrollbarGap = true } = options;
  useIsomorphicLayoutEffect(() => {
    if (!locked || !isBrowser) return;
    lock(reserveScrollbarGap);
    return unlock;
  }, [locked, reserveScrollbarGap]);
}
