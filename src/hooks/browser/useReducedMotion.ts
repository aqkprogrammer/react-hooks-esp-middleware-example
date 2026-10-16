import { useMediaQuery } from './useMediaQuery';

export interface UseReducedMotionOptions {
  /**
   * Value on the server, during hydration and without `matchMedia`. Default
   * `false`. Choose `true` if a large first-paint animation must never play for
   * users who might have asked for reduced motion.
   */
  defaultValue?: boolean;
}

/**
 * `true` when the user asked the OS to minimise non-essential motion
 * (`prefers-reduced-motion: reduce`), via `useMediaQuery`. Updates live.
 *
 * Use it to switch JavaScript-driven animation off (or to a cross-fade):
 * scroll-into-view smoothing, animated counters, parallax, carousels that
 * autoplay. CSS animations are better handled with the media query in CSS.
 *
 * Reduced motion is not "no motion": keep feedback that helps understanding,
 * but replace large movements, zooms and parallax.
 */
export function useReducedMotion(options: UseReducedMotionOptions = {}): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', {
    defaultValue: options.defaultValue ?? false,
  });
}
