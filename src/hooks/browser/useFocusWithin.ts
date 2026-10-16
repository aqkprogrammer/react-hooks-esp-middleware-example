import { useCallback, useEffect, useState } from 'react';
import { useLatest } from '../state/useLatest';

export interface UseFocusWithinOptions {
  /** Focus entered the subtree from outside. */
  onFocusWithin?: (event: FocusEvent) => void;
  /**
   * Focus left the subtree: it moved to an element outside, to nothing
   * (`relatedTarget` is `null`, e.g. a click on a non-focusable area), or the
   * window lost focus. Moving focus *between* descendants does not fire it.
   */
  onBlurWithin?: (event: FocusEvent) => void;
}

/**
 * `[ref, isFocusWithin]` — whether focus is on the element or any descendant,
 * like CSS `:focus-within`, plus callbacks for entering and leaving.
 *
 * The decisive detail is `relatedTarget`: on `focusout` it is the element
 * receiving focus next. If that element is still inside, focus merely moved
 * within the group and nothing happens. This is what makes "close the popover
 * when keyboard focus leaves it" reliable — a plain `blur` handler fires on
 * every move between the popover's own buttons.
 *
 * SSR-safe: `false` on the server.
 */
export function useFocusWithin<T extends HTMLElement | SVGElement = HTMLElement>(
  options: UseFocusWithinOptions = {},
): readonly [ref: (node: T | null) => void, isFocusWithin: boolean] {
  const callbacks = useLatest(options);
  const [element, setElement] = useState<T | null>(null);
  const [focusedWithin, setFocusedWithin] = useState<T | null>(null);

  const ref = useCallback((node: T | null) => {
    setElement(node);
    if (node && node.contains(node.ownerDocument.activeElement)) setFocusedWithin(node);
  }, []);

  useEffect(() => {
    if (!element) return;
    let within = element.contains(element.ownerDocument.activeElement);
    const onFocusIn = (event: Event) => {
      setFocusedWithin(element);
      if (within) return;
      within = true;
      callbacks.current.onFocusWithin?.(event as FocusEvent);
    };
    const onFocusOut = (event: Event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (next instanceof Node && element.contains(next)) return;
      within = false;
      setFocusedWithin(null);
      callbacks.current.onBlurWithin?.(event as FocusEvent);
    };
    element.addEventListener('focusin', onFocusIn);
    element.addEventListener('focusout', onFocusOut);
    return () => {
      element.removeEventListener('focusin', onFocusIn);
      element.removeEventListener('focusout', onFocusOut);
    };
  }, [element, callbacks]);

  return [ref, element !== null && focusedWithin === element] as const;
}
