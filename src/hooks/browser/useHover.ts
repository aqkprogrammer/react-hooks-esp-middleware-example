import { useCallback, useEffect, useState } from 'react';
import { useLatest } from '../state/useLatest';

export interface UseHoverOptions {
  /**
   * Ignore touch "hover". On touch screens `pointerenter` fires on tap and the
   * element stays "hovered" until the user taps elsewhere, which is rarely what
   * a hover affordance wants. Default `true`.
   */
  ignoreTouch?: boolean;
  /** Called after the hover state changes. */
  onChange?: (isHovered: boolean, event: PointerEvent) => void;
}

/**
 * `[ref, isHovered]` — attach `ref` to an element and get whether a pointer is
 * over it.
 *
 * ```tsx
 * const [ref, isHovered] = useHover<HTMLDivElement>();
 * return <div ref={ref}>{isHovered ? 'Hi!' : 'Hover me'}</div>;
 * ```
 *
 * - Uses `pointerenter`/`pointerleave` (no bubbling, so moving between child
 *   elements does not flicker).
 * - `ref` is a *callback ref*: it works for elements that mount later or are
 *   swapped, and the state resets when the element changes.
 * - SSR-safe: `false` on the server.
 *
 * If you only need a visual effect, CSS `:hover` is simpler and works without
 * JavaScript. Hover is not available to keyboard or many touch users — never
 * hide essential content or actions behind it.
 */
export function useHover<T extends Element = HTMLElement>(
  options: UseHoverOptions = {},
): readonly [ref: (node: T | null) => void, isHovered: boolean] {
  const { ignoreTouch = true, onChange } = options;
  const onChangeRef = useLatest(onChange);
  const [element, setElement] = useState<T | null>(null);
  // Store *which* element is hovered, so a swapped element is never reported
  // as hovered by mistake and nothing needs resetting in an effect.
  const [hovered, setHovered] = useState<T | null>(null);

  useEffect(() => {
    if (!element) return;
    const isTouch = (event: PointerEvent) => ignoreTouch && event.pointerType === 'touch';
    const onEnter = (event: Event) => {
      const pointerEvent = event as PointerEvent;
      if (isTouch(pointerEvent)) return;
      setHovered(element);
      onChangeRef.current?.(true, pointerEvent);
    };
    const onLeave = (event: Event) => {
      const pointerEvent = event as PointerEvent;
      if (isTouch(pointerEvent)) return;
      setHovered(null);
      onChangeRef.current?.(false, pointerEvent);
    };
    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointerleave', onLeave);
    };
  }, [element, ignoreTouch, onChangeRef]);

  const ref = useCallback((node: T | null) => setElement(node), []);
  return [ref, element !== null && hovered === element] as const;
}
