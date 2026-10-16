import { useEffect, type RefObject } from 'react';
import { useLatest } from '../state/useLatest';
import { isTopLayer, pushLayer, removeLayer } from './layerStack';
import { getTabbableElements } from './tabbable';

/**
 * Where focus goes when the trap activates (unless focus is already inside):
 * - `'first'` (default): the first tabbable element, else the container;
 * - `'container'`: the container itself (good when the content starts with text);
 * - a ref: that element (e.g. the primary input);
 * - `false`: leave focus alone.
 */
export type InitialFocus = 'first' | 'container' | RefObject<HTMLElement | null> | false;

export interface UseFocusTrapOptions {
  /** Default `true`. Toggle to activate/deactivate without unmounting. */
  active?: boolean;
  initialFocus?: InitialFocus;
  /** Return focus to where it was before activation when the trap deactivates. Default `true`. */
  restoreFocus?: boolean;
  /** Focus this element on deactivation instead of the previously focused one. */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

/**
 * Keeps keyboard focus inside `containerRef` while active: Tab from the last
 * tabbable element wraps to the first, Shift+Tab from the first wraps to the
 * last, and focus that escapes (e.g. a click outside) is pulled back.
 * Tabbable elements are looked up on every key press, so content that is
 * added, removed or disabled while the trap is active is handled.
 *
 * On deactivation focus returns to the element that was focused before.
 * Nested traps cooperate: only the most recently activated one acts.
 *
 * **Prefer a native `<dialog>` opened with `showModal()`** for modal dialogs —
 * the browser makes the rest of the page inert, handles Escape and restores
 * focus, with no JavaScript trap (see `useDialogState`). Use this hook for
 * non-modal patterns that still need containment, or custom overlays.
 *
 * The container is given `tabindex="-1"` (and it is removed afterwards) if
 * it must receive focus and has no tabindex.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = {},
): void {
  const { active = true, restoreFocus = true } = options;
  const optionsRef = useLatest(options);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { returnFocusTo } = optionsRef.current;
    const token = pushLayer('focus-trap');
    let addedTabIndex = false;
    let lastFocusedInside: HTMLElement | null = null;

    const focusContainer = () => {
      if (!container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
        addedTabIndex = true;
      }
      container.focus();
    };
    const focusFirst = () => {
      const [first] = getTabbableElements(container);
      if (first) first.focus();
      else focusContainer();
    };

    if (!container.contains(document.activeElement)) {
      const initialFocus = optionsRef.current.initialFocus ?? 'first';
      if (initialFocus === 'first') focusFirst();
      else if (initialFocus === 'container') focusContainer();
      else if (initialFocus) {
        if (initialFocus.current) initialFocus.current.focus();
        else focusFirst();
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented || !isTopLayer('focus-trap', token)) return;
      const tabbable = getTabbableElements(container);
      const first = tabbable[0];
      const last = tabbable[tabbable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        focusContainer();
        return;
      }
      const current = document.activeElement;
      const outside = !current || !container.contains(current) || current === container;
      if (event.shiftKey && (current === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isTopLayer('focus-trap', token)) return;
      const target = event.target;
      if (target instanceof Node && container.contains(target)) {
        lastFocusedInside = target instanceof HTMLElement ? target : null;
        return;
      }
      // Focus escaped (click outside, programmatic focus): pull it back.
      if (lastFocusedInside?.isConnected && container.contains(lastFocusedInside)) {
        lastFocusedInside.focus();
      } else {
        focusFirst();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      removeLayer('focus-trap', token);
      if (addedTabIndex) container.removeAttribute('tabindex');
      if (!restoreFocus) return;
      const target = returnFocusTo?.current ?? previouslyFocused;
      const current = document.activeElement;
      // Do not steal focus if the user already moved it somewhere meaningful.
      const focusIsLost = !current || current === document.body || container.contains(current);
      if (target?.isConnected && focusIsLost) target.focus();
    };
  }, [active, restoreFocus, containerRef, optionsRef]);
}
