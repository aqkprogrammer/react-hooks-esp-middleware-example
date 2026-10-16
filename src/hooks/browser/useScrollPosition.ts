import { useEffect, useState, type RefObject } from 'react';
import { isBrowser } from '../internal/env';
import { scheduleFrame } from './shared';

export interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * What to track:
 * - `undefined` → the window (document scrolling element),
 * - an element or a ref to one (read when the effect runs),
 * - `null` → nothing.
 */
export type ScrollTarget = Element | RefObject<Element | null> | null | undefined;

const ORIGIN: ScrollPosition = { x: 0, y: 0 };

function resolve(target: ScrollTarget): Window | Element | null {
  if (target === undefined) return isBrowser ? window : null;
  if (target === null) return null;
  if ('current' in target) return target.current;
  return target;
}

function read(target: Window | Element): ScrollPosition {
  return target instanceof Element
    ? { x: target.scrollLeft, y: target.scrollTop }
    : { x: target.scrollX, y: target.scrollY };
}

/**
 * The scroll offset of the window (default) or of a scrollable element.
 *
 * - The `scroll` listener is **passive** (never blocks scrolling) and updates
 *   are batched to at most one per animation frame, so fast scrolling costs at
 *   most one re-render per frame.
 * - Returns `{ x: 0, y: 0 }` on the server; the real position is read in the
 *   first frame after mount (also after the target changes).
 * - The pending frame and the listener are cleaned up on unmount.
 *
 * Re-rendering on scroll is still work: for scroll-linked *visuals* prefer CSS
 * (`position: sticky`, scroll-driven animations) and for "is X visible?" use
 * `useIntersectionObserver`.
 */
export function useScrollPosition(target?: ScrollTarget): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>(ORIGIN);

  useEffect(() => {
    const element = resolve(target);
    if (!element) return;
    let cancelFrame: (() => void) | null = null;
    const update = () => {
      cancelFrame = null;
      const next = read(element);
      setPosition((previous) => (previous.x === next.x && previous.y === next.y ? previous : next));
    };
    const onScroll = () => {
      if (cancelFrame === null) cancelFrame = scheduleFrame(update);
    };
    // Initial read in the next frame (also covers restored scroll positions).
    onScroll();
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
      cancelFrame?.();
    };
  }, [target]);

  return position;
}
