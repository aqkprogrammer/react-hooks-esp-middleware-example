import { useEffect, useRef } from 'react';
import { useLatest } from '../state/useLatest';
import { isTopLayer, pushLayer, removeLayer } from './layerStack';
import { useKeyboardShortcut } from './useKeyboardShortcut';

export interface UseEscapeKeyOptions {
  /** Default `true`. Typically the "is open" state of the overlay. */
  enabled?: boolean;
}

/**
 * Calls `onEscape` when Escape is pressed — but **only for the topmost
 * enabled layer**. With a popover open inside a drawer, the first Escape
 * closes the popover and the second closes the drawer, instead of both
 * closing at once (which a plain `keydown` listener per overlay would do).
 *
 * Built on `useKeyboardShortcut('escape', …)` with `allowInInputs: true`
 * (Escape should still close an overlay while typing in it); layers are
 * ordered by when they became enabled.
 *
 * Native `<dialog>` (via `showModal()`) and the Popover API already close on
 * Escape (`cancel` / light dismiss) — do not add this hook to those.
 */
export function useEscapeKey(
  onEscape: (event: KeyboardEvent) => void,
  options: UseEscapeKeyOptions = {},
): void {
  const { enabled = true } = options;
  const tokenRef = useRef<symbol | null>(null);
  const onEscapeRef = useLatest(onEscape);

  useEffect(() => {
    if (!enabled) return;
    const token = pushLayer('escape');
    tokenRef.current = token;
    return () => {
      removeLayer('escape', token);
      if (tokenRef.current === token) tokenRef.current = null;
    };
  }, [enabled]);

  useKeyboardShortcut(
    'escape',
    (event) => {
      if (!isTopLayer('escape', tokenRef.current)) return;
      onEscapeRef.current(event);
    },
    { enabled, allowInInputs: true, preventDefault: false },
  );
}
