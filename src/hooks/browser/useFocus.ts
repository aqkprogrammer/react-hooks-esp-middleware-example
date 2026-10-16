import { useCallback, useEffect, useState } from 'react';
import { useLatest } from '../state/useLatest';

export interface UseFocusOptions {
  /** Called after the element gains (`true`) or loses (`false`) focus. */
  onChange?: (isFocused: boolean, event: FocusEvent) => void;
}

/**
 * `[ref, isFocused]` — whether the element itself is focused.
 *
 * ```tsx
 * const [ref, isFocused] = useFocus<HTMLInputElement>();
 * <input ref={ref} />{isFocused && <p>Press Enter to search</p>}
 * ```
 *
 * - `ref` is a callback ref; the state follows element swaps.
 * - Elements that are already focused when the ref attaches (e.g. `autoFocus`,
 *   which React applies before refs are attached) are detected.
 * - Focus inside *descendants* does not count — use `useFocusWithin` for that.
 * - SSR-safe: `false` on the server.
 *
 * Use CSS `:focus` / `:focus-visible` for styling; this hook is for behaviour.
 */
export function useFocus<T extends HTMLElement | SVGElement = HTMLElement>(
  options: UseFocusOptions = {},
): readonly [ref: (node: T | null) => void, isFocused: boolean] {
  const onChangeRef = useLatest(options.onChange);
  const [element, setElement] = useState<T | null>(null);
  const [focused, setFocused] = useState<T | null>(null);

  const ref = useCallback((node: T | null) => {
    setElement(node);
    // Ref callbacks run in the commit phase, so reading the DOM here is safe.
    if (node && node.ownerDocument.activeElement === node) setFocused(node);
  }, []);

  useEffect(() => {
    if (!element) return;
    const onFocus = (event: Event) => {
      setFocused(element);
      onChangeRef.current?.(true, event as FocusEvent);
    };
    const onBlur = (event: Event) => {
      setFocused(null);
      onChangeRef.current?.(false, event as FocusEvent);
    };
    element.addEventListener('focus', onFocus);
    element.addEventListener('blur', onBlur);
    return () => {
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
    };
  }, [element, onChangeRef]);

  return [ref, element !== null && focused === element] as const;
}
