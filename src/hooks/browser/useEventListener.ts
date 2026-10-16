import { useEffect, type RefObject } from 'react';
import { useLatest } from '../state/useLatest';

/**
 * Where to attach the listener:
 * - `undefined` → `window` (the default)
 * - an `EventTarget` (e.g. `document`, a `MediaQueryList`, a `WebSocket`)
 * - a ref to an element (read when the effect runs)
 * - `null` → no listener (handy for conditionally disabling)
 */
export type EventTargetLike<T extends EventTarget = EventTarget> = T | RefObject<T | null> | null;

export interface EventListenerOptions {
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

function resolveTarget(target: EventTargetLike | undefined): EventTarget | null {
  if (target === undefined) return typeof window === 'undefined' ? null : window;
  if (target === null) return null;
  if ('current' in target) return target.current;
  return target;
}

export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  // `Window | null` (not just `undefined`) so `enabled ? undefined : null`
  // keeps the typed event instead of falling through to the `Event` overload.
  target?: Window | null,
  options?: EventListenerOptions,
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  target: Document | null,
  options?: EventListenerOptions,
): void;
export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  target: RefObject<T | null> | T | null,
  options?: EventListenerOptions,
): void;
export function useEventListener<E extends Event = Event>(
  type: string,
  handler: (event: E) => void,
  target?: EventTargetLike,
  options?: EventListenerOptions,
): void;

/**
 * Subscribes to a DOM event and removes the listener on unmount or when the
 * event type, target or options change.
 *
 * The latest `handler` is always called, but changing it does **not**
 * re-subscribe — so inline arrow functions are fine and no `useCallback` is
 * needed.
 *
 * Evolved from the original `src/common/hooks/useEventListener.ts` of this
 * repository: same idea (a ref holding the latest handler), now typed,
 * SSR-safe, ref-aware and option-aware.
 */
export function useEventListener(
  type: string,
  handler: (event: Event) => void,
  target?: EventTargetLike,
  options: EventListenerOptions = {},
): void {
  const handlerRef = useLatest(handler);
  const { capture = false, passive, once = false } = options;
  // A ref object is stable, so depend on the ref and resolve `.current` inside
  // the effect, which runs after React has attached it.
  useEffect(() => {
    const element = resolveTarget(target);
    if (!element || typeof element.addEventListener !== 'function') return;
    const listener = (event: Event) => handlerRef.current(event);
    const listenerOptions: AddEventListenerOptions = { capture, once };
    if (passive !== undefined) listenerOptions.passive = passive;
    element.addEventListener(type, listener, listenerOptions);
    return () => element.removeEventListener(type, listener, { capture });
  }, [type, target, capture, passive, once, handlerRef]);
}
