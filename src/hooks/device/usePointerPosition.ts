import { useEffect, useState, type RefObject } from 'react';

export interface PointerPosition {
  /** Viewport coordinates (`clientX`/`clientY`). */
  clientX: number;
  clientY: number;
  /** Relative to the target's top-left corner; equals `clientX`/`clientY` for the window. */
  x: number;
  y: number;
  /** Position as a 0–1 fraction of the target's width/height (clamped). */
  ratioX: number;
  ratioY: number;
  /** `mouse`, `pen` or `touch`. */
  pointerType: string;
}

export interface UsePointerPositionOptions {
  /**
   * Element to track. Omit to track the pointer anywhere in the window.
   * With an element, the position resets to `null` on `pointerleave`.
   */
  target?: RefObject<HTMLElement | null>;
  /** Pause tracking without unmounting (default `true`). */
  enabled?: boolean;
}

/**
 * Tracks the pointer (mouse, pen or touch) over the window or an element.
 *
 * `pointermove` can fire hundreds of times per second; this hook keeps only
 * the latest event and commits at most **one state update per animation
 * frame** (`requestAnimationFrame`), which is as often as the screen can show
 * it anyway. The listener is passive and removed — along with any pending
 * frame — on unmount or when `enabled`/`target` change.
 *
 * Returns `null` until the first move (and on the server).
 *
 * Touch input only produces `pointermove` while the finger is down, and
 * browsers may claim the gesture for scrolling — add `touch-action: none` to
 * the element if you need continuous tracking.
 */
export function usePointerPosition(
  options: UsePointerPositionOptions = {},
): PointerPosition | null {
  const { target, enabled = true } = options;
  const [position, setPosition] = useState<PointerPosition | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const element = target ? target.current : window;
    if (!element) return;

    let frame: number | null = null;
    let latest: PointerEvent | null = null;

    const flush = () => {
      frame = null;
      const event = latest;
      if (!event) return;
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        setPosition({
          clientX: event.clientX,
          clientY: event.clientY,
          x,
          y,
          ratioX: rect.width > 0 ? clamp01(x / rect.width) : 0,
          ratioY: rect.height > 0 ? clamp01(y / rect.height) : 0,
          pointerType: event.pointerType,
        });
      } else {
        setPosition({
          clientX: event.clientX,
          clientY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          ratioX: window.innerWidth > 0 ? clamp01(event.clientX / window.innerWidth) : 0,
          ratioY: window.innerHeight > 0 ? clamp01(event.clientY / window.innerHeight) : 0,
          pointerType: event.pointerType,
        });
      }
    };

    const onMove = (event: Event) => {
      latest = event as PointerEvent;
      if (frame === null) frame = requestAnimationFrame(flush);
    };
    const onLeave = () => {
      latest = null;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      setPosition(null);
    };

    element.addEventListener('pointermove', onMove, { passive: true });
    if (target) element.addEventListener('pointerleave', onLeave);
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [target, enabled]);

  return position;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
