import { useId, useMemo, useState, useSyncExternalStore } from 'react';
import type { Router } from 'esp-js';
import { createReducerStore } from '../reducer/createReducerStore';
import type { Dispatch, Middleware, Reducer } from '../reducer/types';
import type { EspEventFilter, EspStage, EspStageInfo } from './bridge';
import {
  createEspMiddleware,
  espBroadcast,
  espPublish,
  type EspLifecycleAction,
  type EspOutgoingAction,
} from './espMiddleware';
import { useEspBridge } from './useEspBridge';
import { useEspRouter } from './useEspRouter';

/** Everything that can flow through an ESP-aware store. */
export type EspStoreAction<A> = A | EspOutgoingAction | EspLifecycleAction;

export interface UseEspReducerOptions<S, A> {
  /** Prefix for the generated model id, e.g. "price-tile" → "price-tile-«r1»". */
  modelName: string;
  /**
   * Router event types this store handles. They reach the reducer as
   * `{ type: eventType, payload: event }`, so declare matching members in `A`.
   */
  observedEvents: readonly string[];
  /** Middleware that run before the ESP middleware (outermost first). */
  middleware?: ReadonlyArray<Middleware<S, EspStoreAction<A>>>;
  /** Defaults to the router from `<EspRouterProvider>` (or the shared workspace router). */
  router?: Router;
  stage?: EspStage;
  filters?: Readonly<Record<string, EspEventFilter>>;
  commitEventTypes?: readonly string[];
  onStage?: (info: EspStageInfo) => void;
  onError?: (error: unknown, info: EspStageInfo) => void;
}

export interface EspStoreHandle {
  modelId: string;
  router: Router;
  /** Route an event to this store's model only. */
  publish: (eventType: string, event: unknown) => void;
  /** Route an event to every model observing `eventType`. */
  broadcast: (eventType: string, event: unknown) => void;
}

/**
 * `useReducer` + middleware + an esp-js model, in one hook.
 *
 * ```ts
 * const [state, dispatch, esp] = useEspReducer(reducer, initialState, {
 *   modelName: 'accumulators',
 *   observedEvents: [KEY_PRESSED],
 * });
 * esp.broadcast(KEY_PRESSED, { key: 'Insert' }); // every tile observing KEY_PRESSED reacts
 * ```
 *
 * The reducer, initial state, middleware, router and model id are fixed for
 * the component's lifetime (like `useReducer`'s reducer identity rules).
 */
export function useEspReducer<S, A extends { type: string }>(
  reducer: Reducer<S, EspStoreAction<A>>,
  initialState: S,
  options: UseEspReducerOptions<S, A>,
): readonly [state: S, dispatch: Dispatch<EspStoreAction<A>>, esp: EspStoreHandle] {
  const contextRouter = useEspRouter();
  const reactId = useId();
  const [{ store, router, modelId }] = useState(() => {
    const fixedRouter = options.router ?? contextRouter;
    const id = `${options.modelName}-${reactId}`;
    return {
      router: fixedRouter,
      modelId: id,
      store: createReducerStore<S, EspStoreAction<A>>(reducer, initialState, [
        ...(options.middleware ?? []),
        createEspMiddleware<S, EspStoreAction<A>>({
          router: fixedRouter,
          modelId: id,
          ...(options.onError
            ? {
                onError: (error, action) =>
                  options.onError?.(error, {
                    modelId: id,
                    eventType: action.payload.eventType,
                    event: action.payload.event,
                    stage: 'error',
                  }),
              }
            : {}),
        }),
      ]),
    };
  });

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  useEspBridge({
    router,
    modelId,
    eventTypes: options.observedEvents,
    // Router events are re-typed as store actions; see `observedEvents`.
    dispatch: (action) => store.dispatch(action as EspStoreAction<A>),
    ...(options.stage ? { stage: options.stage } : {}),
    ...(options.filters ? { filters: options.filters } : {}),
    ...(options.commitEventTypes ? { commitEventTypes: options.commitEventTypes } : {}),
    ...(options.onStage ? { onStage: options.onStage } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
  });

  const esp = useMemo<EspStoreHandle>(
    () => ({
      modelId,
      router,
      publish: (eventType, event) => store.dispatch(espPublish(eventType, event)),
      broadcast: (eventType, event) => store.dispatch(espBroadcast(eventType, event)),
    }),
    [modelId, router, store],
  );

  return [state, store.dispatch, esp] as const;
}
