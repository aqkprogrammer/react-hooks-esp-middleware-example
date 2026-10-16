/**
 * Maps event names to payload types. Use `void` for events without a payload:
 *
 * ```ts
 * type AppEvents = { toast: { text: string }; logout: void };
 * ```
 */
export type EmitterEventMap = Record<string, unknown>;

export type EmitterHandler<Payload> = (payload: Payload) => void;

/** `emit('logout')` for `void` payloads, `emit('toast', { text })` otherwise. */
export type EmitArgs<Payload> = [Payload] extends [void] ? [] : [payload: Payload];

export interface Emitter<Events extends EmitterEventMap> {
  /** Adds a handler and returns a function that removes it. */
  on<K extends keyof Events & string>(type: K, handler: EmitterHandler<Events[K]>): () => void;
  /** Removes a handler previously added with `on`. */
  off<K extends keyof Events & string>(type: K, handler: EmitterHandler<Events[K]>): void;
  /**
   * Calls every handler for `type` synchronously, in subscription order.
   * Handlers added or removed during an emit take effect from the next emit.
   * If handlers throw, the rest still run and the error (or an
   * `AggregateError` for several) is re-thrown afterwards.
   */
  emit<K extends keyof Events & string>(type: K, ...args: EmitArgs<Events[K]>): void;
  /** Number of handlers for `type`, or for all events. */
  listenerCount(type?: keyof Events & string): number;
  /** Removes every handler. */
  clear(): void;
}

/**
 * Creates a tiny, typed, synchronous publish/subscribe channel — a
 * dependency-free cousin of Node's `EventEmitter` / `mitt`.
 *
 * Create emitters at module level (or once, in a context) and subscribe from
 * components with `useEventEmitter`.
 */
export function createEmitter<Events extends EmitterEventMap>(): Emitter<Events> {
  const handlers = new Map<string, Set<EmitterHandler<never>>>();

  const off: Emitter<Events>['off'] = (type, handler) => {
    const set = handlers.get(type);
    if (!set) return;
    set.delete(handler as EmitterHandler<never>);
    if (set.size === 0) handlers.delete(type);
  };

  // Methods never use `this`, so they can be destructured or passed around.
  return {
    off,
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler as EmitterHandler<never>);
      return () => off(type, handler);
    },
    emit(type, ...args) {
      const set = handlers.get(type);
      if (!set) return;
      const errors: unknown[] = [];
      // Iterate over a copy so (un)subscribing inside a handler is safe.
      for (const handler of [...set]) {
        try {
          (handler as EmitterHandler<unknown>)(args[0]);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) {
        throw new AggregateError(errors, `${errors.length} "${type}" handlers threw`);
      }
    },
    listenerCount(type) {
      if (type !== undefined) return handlers.get(type)?.size ?? 0;
      let total = 0;
      for (const set of handlers.values()) total += set.size;
      return total;
    },
    clear() {
      handlers.clear();
    },
  };
}
