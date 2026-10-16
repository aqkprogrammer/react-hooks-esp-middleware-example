import { useEffect, type RefObject } from 'react';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';

/** Events that count as "pressing" somewhere. `PointerEvent` extends `MouseEvent`. */
export type ClickOutsideEvent = MouseEvent | TouchEvent;

export type ClickOutsideEventType = 'pointerdown' | 'mousedown' | 'touchstart' | 'click';

export interface UseClickOutsideOptions {
  /** Set to `false` to detach the listeners (e.g. while a popover is closed). Default `true`. */
  enabled?: boolean;
  /**
   * DOM events to listen for. Defaults to `['pointerdown']` (mouse, touch and
   * pen in one event) and falls back to `['mousedown', 'touchstart']` in
   * browsers without Pointer Events.
   */
  events?: readonly ClickOutsideEventType[];
  /**
   * Presses inside these elements never count as "outside": CSS selectors
   * (matched with `closest()`) or refs. Typical use: the button that toggles
   * the popover, so its own click handler is not fighting this hook.
   */
  ignore?: ReadonlyArray<string | RefObject<Element | null>>;
}

type Refs = RefObject<Element | null> | ReadonlyArray<RefObject<Element | null>>;

function isInside(element: Element | null, event: Event, target: Node): boolean {
  if (!element) return false;
  // composedPath() sees through shadow roots, where `event.target` is retargeted.
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  return path.includes(element) || element.contains(target);
}

/**
 * Calls `handler` when the user presses outside of every element in `refs`
 * — the classic "close the dropdown / popover / menu" behaviour.
 *
 * - Listens on `document` in the **capture** phase, so presses are seen even
 *   if some component calls `stopPropagation()`, and before React re-renders
 *   and possibly removes the pressed element.
 * - Accepts one ref or several (e.g. a trigger button and a portalled menu).
 * - The latest `handler`, `refs` and `ignore` are always used; changing them
 *   does not re-subscribe.
 * - SSR-safe: does nothing until it runs in the browser.
 *
 * Keyboard users do not "click outside": also close on `Escape` and, if the
 * popover is non-modal, when focus leaves it (see `useFocusWithin`).
 */
export function useClickOutside(
  refs: Refs,
  handler: (event: ClickOutsideEvent) => void,
  options: UseClickOutsideOptions = {},
): void {
  const { enabled = true, events, ignore } = options;
  const handlerRef = useLatest(handler);
  const refsRef = useLatest(refs);
  const ignoreRef = useLatest(ignore);
  // Primitive key so a new array literal each render does not re-subscribe.
  const eventsKey = events ? events.join(',') : '';

  useEffect(() => {
    if (!enabled || !isBrowser) return;
    const types: string[] = eventsKey
      ? eventsKey.split(',')
      : typeof window.PointerEvent === 'function'
        ? ['pointerdown']
        : ['mousedown', 'touchstart'];

    const listener = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // A press on something that has already been removed from the page
      // cannot be judged reliably; ignore it.
      if (!target.isConnected) return;
      const current = refsRef.current;
      const list: ReadonlyArray<RefObject<Element | null>> = Array.isArray(current)
        ? current
        : [current as RefObject<Element | null>];
      if (list.some((ref) => isInside(ref.current, event, target))) return;
      const ignored = ignoreRef.current ?? [];
      for (const entry of ignored) {
        if (typeof entry === 'string') {
          const element = target instanceof Element ? target : target.parentElement;
          if (element?.closest(entry)) return;
        } else if (isInside(entry.current, event, target)) {
          return;
        }
      }
      handlerRef.current(event as ClickOutsideEvent);
    };

    for (const type of types) {
      document.addEventListener(type, listener, { capture: true, passive: true });
    }
    return () => {
      for (const type of types) document.removeEventListener(type, listener, { capture: true });
    };
  }, [enabled, eventsKey, handlerRef, refsRef, ignoreRef]);
}
