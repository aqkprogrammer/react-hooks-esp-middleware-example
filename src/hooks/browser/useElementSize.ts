import { useCallback, useRef, useState } from 'react';
import { useResizeObserver } from './useResizeObserver';

export interface ElementSize {
  width: number;
  height: number;
}

export interface UseElementSizeOptions {
  /**
   * `'content-box'` (default) excludes padding and border, matching
   * `box-sizing: content-box` sizes; `'border-box'` includes them, matching
   * what the user sees (and `offsetWidth`, but fractional).
   */
  box?: 'content-box' | 'border-box';
  /** Reported on the server, before the first measurement and without `ResizeObserver`. Default `0 × 0`. */
  initialSize?: ElementSize;
}

export interface UseElementSizeResult<T extends Element> extends ElementSize {
  /** Callback ref for the element to measure. */
  ref: (node: T | null) => void;
  isSupported: boolean;
}

interface Measurement extends ElementSize {
  node: Element;
  box: string;
}

const ZERO: ElementSize = { width: 0, height: 0 };

function measure(entry: ResizeObserverEntry, box: 'content-box' | 'border-box'): ElementSize {
  const sizes = box === 'border-box' ? entry.borderBoxSize : entry.contentBoxSize;
  // Arrays per fragment; Safari < 15.4 lacks them entirely.
  const first = sizes?.[0];
  if (first) return { width: first.inlineSize, height: first.blockSize };
  if (box === 'border-box' && entry.target instanceof HTMLElement) {
    return { width: entry.target.offsetWidth, height: entry.target.offsetHeight };
  }
  return { width: entry.contentRect.width, height: entry.contentRect.height };
}

/**
 * Measures an element with `ResizeObserver` (via `useResizeObserver`) and
 * returns `{ ref, width, height, isSupported }`.
 *
 * ```tsx
 * const { ref, width } = useElementSize<HTMLDivElement>({ box: 'border-box' });
 * return <div ref={ref}>{width > 400 ? <Wide /> : <Narrow />}</div>;
 * ```
 *
 * - Re-renders only when the size actually changes.
 * - Sizes are the *logical* inline/block sizes: in vertical writing modes
 *   `width` is the vertical extent.
 * - Before the first measurement (and on the server) `initialSize` is
 *   returned, so the first client render cannot know the real size. Prefer CSS
 *   container queries when the goal is only styling.
 */
export function useElementSize<T extends Element = HTMLElement>(
  options: UseElementSizeOptions = {},
): UseElementSizeResult<T> {
  const { box = 'content-box', initialSize = ZERO } = options;
  const [element, setElement] = useState<T | null>(null);
  const [measured, setMeasured] = useState<Measurement | null>(null);
  // The last reported measurement, compared in the observer callback so an
  // unchanged size does not even schedule a render.
  const lastRef = useRef<Measurement | null>(null);

  const { isSupported } = useResizeObserver(
    element,
    (entry) => {
      const next = measure(entry, box);
      const last = lastRef.current;
      if (
        last &&
        last.node === entry.target &&
        last.box === box &&
        last.width === next.width &&
        last.height === next.height
      ) {
        return;
      }
      const measurement = { ...next, node: entry.target, box };
      lastRef.current = measurement;
      setMeasured(measurement);
    },
    { box },
  );

  const ref = useCallback((node: T | null) => setElement(node), []);
  // A measurement of a previous element or box is not valid any more.
  const valid = measured !== null && measured.node === element && measured.box === box;
  return {
    ref,
    width: valid ? measured.width : initialSize.width,
    height: valid ? measured.height : initialSize.height,
    isSupported,
  };
}
