import { useEffect, useLayoutEffect } from 'react';
import { isBrowser } from './env';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * React 18+ no longer warns about `useLayoutEffect` during SSR, but the effect
 * still never runs there. This alias documents intent: "run before paint when
 * there is a paint".
 */
export const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;
