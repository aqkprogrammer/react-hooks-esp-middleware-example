import {
  useEffect,
  useMemo,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useLatest } from '../state/useLatest';

/** The event that started the press. */
export type LongPressEvent<T extends Element = Element> = PointerEvent<T> | KeyboardEvent<T>;

export interface UseLongPressOptions<T extends Element = Element> {
  /** How long (ms) the press must be held. Default `500`. */
  threshold?: number;
  /** Pointer movement (px) that cancels the press. Default `10`. */
  moveTolerance?: number;
  /** Also start a press while Space or Enter is held. Default `true`. */
  keyboard?: boolean;
  /** Ignore presses. */
  disabled?: boolean;
  /** A press started. */
  onStart?: (event: LongPressEvent<T>) => void;
  /** The press ended (released, moved, left, blurred) before the threshold. */
  onCancel?: (event: LongPressEvent<T> | FocusEvent<T>) => void;
  /** The press ended after the long press fired. */
  onFinish?: (event: LongPressEvent<T> | FocusEvent<T>) => void;
}

/** Props to spread onto the target element. Stable identity. */
export interface LongPressHandlers<T extends Element = Element> {
  onPointerDown: (event: PointerEvent<T>) => void;
  onPointerMove: (event: PointerEvent<T>) => void;
  onPointerUp: (event: PointerEvent<T>) => void;
  onPointerLeave: (event: PointerEvent<T>) => void;
  onPointerCancel: (event: PointerEvent<T>) => void;
  onKeyDown: (event: KeyboardEvent<T>) => void;
  onKeyUp: (event: KeyboardEvent<T>) => void;
  onBlur: (event: FocusEvent<T>) => void;
  onContextMenu: (event: MouseEvent<T>) => void;
}

interface Press {
  timer: ReturnType<typeof setTimeout> | undefined;
  source: 'pointer' | 'keyboard' | null;
  key: string;
  x: number;
  y: number;
  fired: boolean;
}

const isActivationKey = (key: string) => key === ' ' || key === 'Enter';

/**
 * Calls `onLongPress` when an element is pressed and held for `threshold` ms.
 *
 * Returns event handlers to spread onto the element: `<button {...handlers}>`.
 *
 * - **Pointer**: primary button / touch / pen. Moving more than
 *   `moveTolerance` px, leaving the element, or `pointercancel` cancels.
 * - **Keyboard** (default on): holding Space or Enter starts a press (key
 *   repeat is ignored); releasing the key ends it; blur cancels.
 * - The browser context menu (long-touch on mobile) is suppressed *only*
 *   while a press is active.
 * - Short presses still produce a normal `click` — keep `onClick` for the
 *   primary action and the long press as an accelerator or confirmation.
 * - The timer is cleared on unmount.
 */
export function useLongPress<T extends Element = Element>(
  onLongPress: (event: LongPressEvent<T>) => void,
  options: UseLongPressOptions<T> = {},
): LongPressHandlers<T> {
  const callbackRef = useLatest(onLongPress);
  const optionsRef = useLatest(options);
  const pressRef = useRef<Press>({
    timer: undefined,
    source: null,
    key: '',
    x: 0,
    y: 0,
    fired: false,
  });

  useEffect(() => {
    const press = pressRef.current;
    return () => clearTimeout(press.timer);
  }, []);

  return useMemo<LongPressHandlers<T>>(() => {
    const begin = (event: LongPressEvent<T>, source: 'pointer' | 'keyboard') => {
      const press = pressRef.current;
      const { disabled, threshold = 500, onStart } = optionsRef.current;
      if (disabled || press.source !== null) return;
      press.source = source;
      press.fired = false;
      onStart?.(event);
      press.timer = setTimeout(() => {
        press.fired = true;
        press.timer = undefined;
        callbackRef.current(event);
      }, threshold);
    };

    const end = (event: LongPressEvent<T> | FocusEvent<T>) => {
      const press = pressRef.current;
      if (press.source === null) return;
      clearTimeout(press.timer);
      press.timer = undefined;
      press.source = null;
      press.key = '';
      if (press.fired) optionsRef.current.onFinish?.(event);
      else optionsRef.current.onCancel?.(event);
    };

    return {
      onPointerDown: (event) => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        // A press that never saw its pointerup (e.g. the element was replaced
        // mid-press) must not block the new one.
        if (pressRef.current.source !== null) end(event);
        pressRef.current.x = event.clientX;
        pressRef.current.y = event.clientY;
        begin(event, 'pointer');
      },
      onPointerMove: (event) => {
        const press = pressRef.current;
        if (press.source !== 'pointer') return;
        const tolerance = optionsRef.current.moveTolerance ?? 10;
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > tolerance) end(event);
      },
      onPointerUp: (event) => {
        if (pressRef.current.source === 'pointer') end(event);
      },
      onPointerLeave: (event) => {
        if (pressRef.current.source === 'pointer') end(event);
      },
      onPointerCancel: (event) => {
        if (pressRef.current.source === 'pointer') end(event);
      },
      onKeyDown: (event) => {
        if (optionsRef.current.keyboard === false || event.repeat || !isActivationKey(event.key)) {
          return;
        }
        if (pressRef.current.source !== null) return;
        pressRef.current.key = event.key;
        begin(event, 'keyboard');
      },
      onKeyUp: (event) => {
        const press = pressRef.current;
        if (press.source === 'keyboard' && event.key === press.key) end(event);
      },
      onBlur: (event) => end(event),
      onContextMenu: (event) => {
        if (pressRef.current.source !== null) event.preventDefault();
      },
    };
  }, [callbackRef, optionsRef]);
}
