/**
 * Private helpers shared by the browser hooks. Not exported from the public
 * index — the hooks themselves are the public API.
 */
import { useSyncExternalStore, type RefObject } from 'react';
import { noop, toError } from '../internal/env';

/**
 * An element to observe or listen to:
 * - the element itself (e.g. from a callback ref stored in state),
 * - a ref object (read when the effect runs, after React attached it),
 * - `null` → nothing (handy for conditionally disabling).
 */
export type ElementTarget<T extends Element = Element> = T | RefObject<T | null> | null;

export function resolveElement<T extends Element>(target: ElementTarget<T> | undefined): T | null {
  if (target === null || target === undefined) return null;
  if ('current' in target) return target.current;
  return target;
}

const subscribeNever = () => noop;
const serverFalse = () => false;

/**
 * Feature detection that is hydration-safe: the server (and the hydration
 * render) report `false`, then React re-renders with the real answer. Reading
 * `window` directly during render would make server and client markup differ.
 *
 * `check` must return a boolean and must not touch globals unguarded.
 */
export function useIsSupported(check: () => boolean): boolean {
  return useSyncExternalStore(subscribeNever, check, serverFalse);
}

/** `requestAnimationFrame` with a timer fallback for environments without it. */
export function scheduleFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
}

/**
 * Like `toError`, but keeps `name`/`message` of error-like objects that are not
 * `instanceof Error` — `DOMException`s from another realm (iframes) or from
 * environments such as jsdom, where `DOMException` does not extend `Error`.
 */
export function toErrorLike(value: unknown): Error {
  if (value instanceof Error) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  ) {
    const error = new Error(value.message);
    if ('name' in value && typeof value.name === 'string') error.name = value.name;
    return error;
  }
  return toError(value);
}
