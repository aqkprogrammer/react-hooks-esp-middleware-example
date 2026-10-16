import { useEffect } from 'react';
import { useLatest } from '../state/useLatest';
import type { Emitter, EmitterHandler, EmitterEventMap } from './createEmitter';

/**
 * Subscribes a component to one event of a shared, typed emitter created with
 * `createEmitter<Events>()`, and unsubscribes on unmount.
 *
 * ```tsx
 * const bus = createEmitter<{ toast: { text: string } }>();
 * function Toaster() {
 *   useEventEmitter(bus, 'toast', ({ text }) => show(text)); // payload is typed
 * }
 * bus.emit('toast', { text: 'Saved' });                    // from anywhere
 * ```
 *
 * The latest `handler` is always called but changing it does not
 * re-subscribe, so inline functions are fine. Pass `null` as the emitter to
 * pause the subscription.
 *
 * Events are fire-and-forget: a component that mounts after an emit does not
 * see it. For *state* that late subscribers must read, use a store
 * (`useExternalStore`) instead.
 */
export function useEventEmitter<Events extends EmitterEventMap, K extends keyof Events & string>(
  emitter: Emitter<Events> | null,
  type: K,
  handler: EmitterHandler<Events[K]>,
): void {
  const handlerRef = useLatest(handler);
  useEffect(() => {
    if (!emitter) return;
    return emitter.on(type, (payload) => handlerRef.current(payload));
  }, [emitter, type, handlerRef]);
}
