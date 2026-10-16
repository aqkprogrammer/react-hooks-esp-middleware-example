import { useSyncExternalStore } from 'react';
import { noop } from '../internal/env';

const subscribeNever = () => noop;
const serverSnapshot = () => false;

/**
 * Feature detection that is safe for SSR and hydration: the server (and the
 * hydration pass) render `false`, then React re-renders with the real answer
 * on the client — without a `setState` in an effect.
 *
 * `detect` runs on every render, so keep it cheap (a few `typeof` checks).
 * Internal helper; not part of the public API.
 */
export function useBrowserSupport(detect: () => boolean): boolean {
  return useSyncExternalStore(subscribeNever, detect, serverSnapshot);
}
