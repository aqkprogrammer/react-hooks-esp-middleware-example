import { useEffect } from 'react';

export interface UseDocumentTitleOptions {
  /**
   * Restore the title that was there when the component mounted, on unmount.
   * Default `false`.
   */
  restoreOnUnmount?: boolean;
}

/**
 * Sets `document.title` after every commit where `title` changed, and
 * optionally restores the previous title on unmount.
 *
 * - SSR-safe: effects do not run on the server, so nothing is touched there.
 *   (The server-rendered `<title>` comes from your HTML template.)
 * - When several mounted components set the title, the one whose effect ran
 *   last wins, and restore-on-unmount restores whatever was there when *that*
 *   component mounted — keep one owner per page.
 *
 * React 19 also lets you render `<title>` directly in a component; React
 * hoists it into `<head>`, including during SSR. Prefer that for static,
 * per-page titles.
 */
export function useDocumentTitle(title: string, options: UseDocumentTitleOptions = {}): void {
  const { restoreOnUnmount = false } = options;

  // Declared first so it captures the title *before* the effect below changes it.
  useEffect(() => {
    if (!restoreOnUnmount) return;
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, [restoreOnUnmount]);

  useEffect(() => {
    document.title = title;
  }, [title]);
}
