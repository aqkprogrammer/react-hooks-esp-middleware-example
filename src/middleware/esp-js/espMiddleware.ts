/**
 * ESP-JS ⇄ React reducer middleware.
 *
 * This is the heart of the original repository ("wrapping esp-js in middleware
 * to integrate with react hooks"), migrated from esp-js 2.0.1-rc.5 + React
 * 16.8 to esp-js 8 + React 19. The idea is unchanged:
 *
 *   React component ──dispatch──▶ middleware chain ──▶ reducer
 *                                    │  ESP_PUBLISH / ESP_BROADCAST
 *                                    ▼
 *                              esp-js Router  (preview → normal → committed → final)
 *                                    │  final-stage events for this model
 *                                    ▼
 *                       bridge ──dispatch({ type: eventType, payload: event })──▶ reducer
 *
 * The middleware turns two special actions into router calls; the bridge
 * (./bridge.ts) registers a model per React store and feeds router events
 * back into that store's reducer.
 *
 * Nothing here is a built-in React API: esp-js is an event router, the
 * middleware is a plain dispatch wrapper, and React only sees state updates.
 */
import type { Router } from 'esp-js';
import type { Middleware } from '../reducer/types';

/** Action types understood by the ESP middleware (values unchanged from the original). */
export const types = {
  PUBLISH_ACTION: 'ESP_PUBLISH_ACTION',
  BROADCAST_ACTION: 'ESP_BROADCAST_ACTION',
  PREPROCESS_ACTION: 'ESP_PREPROCESS_ACTION',
  POSTPROCESS_ACTION: 'ESP_POSTPROCESS_ACTION',
} as const;

export interface EspPublishAction {
  type: typeof types.PUBLISH_ACTION;
  payload: { eventType: string; event: unknown };
}

export interface EspBroadcastAction {
  type: typeof types.BROADCAST_ACTION;
  payload: { eventType: string; event: unknown };
}

/** Dispatched by the bridge before the router dispatches events to the model. */
export interface EspPreProcessAction {
  type: typeof types.PREPROCESS_ACTION;
}

/** Dispatched by the bridge after the router dispatched events; payload = event types processed. */
export interface EspPostProcessAction {
  type: typeof types.POSTPROCESS_ACTION;
  payload: string[];
}

/** An esp-js event delivered to the reducer: `{ type: eventType, payload: event }`. */
export interface EspEventAction {
  type: string;
  payload?: unknown;
}

export type EspOutgoingAction = EspPublishAction | EspBroadcastAction;
export type EspLifecycleAction = EspPreProcessAction | EspPostProcessAction;

export function isEspOutgoingAction(action: unknown): action is EspOutgoingAction {
  if (typeof action !== 'object' || action === null || !('type' in action)) return false;
  const { type } = action as { type: unknown };
  return type === types.PUBLISH_ACTION || type === types.BROADCAST_ACTION;
}

/** Action creators. */
export const espPublish = (eventType: string, event: unknown): EspPublishAction => ({
  type: types.PUBLISH_ACTION,
  payload: { eventType, event },
});

export const espBroadcast = (eventType: string, event: unknown): EspBroadcastAction => ({
  type: types.BROADCAST_ACTION,
  payload: { eventType, event },
});

/**
 * A helper that can be spread into tile actions to add esp actions — kept
 * from the original API.
 */
export const actions = (dispatch: (action: EspOutgoingAction) => void) => ({
  espPublish: (eventType: string, event: unknown) => dispatch(espPublish(eventType, event)),
  espBroadcast: (eventType: string, event: unknown) => dispatch(espBroadcast(eventType, event)),
});

export interface EspMiddlewareOptions {
  router: Router;
  /** The model id this store registered with the router (see `registerEspBridge`). */
  modelId: string;
  /** Called when the router rejects a publish (e.g. the model is not registered, router halted). */
  onError?: (error: unknown, action: EspOutgoingAction) => void;
  /** Optional trace hook (debug panels, logging). */
  onRoute?: (info: { kind: 'publish' | 'broadcast'; eventType: string; event: unknown }) => void;
}

/**
 * Creates the dispatch middleware.
 *
 * - `ESP_PUBLISH_ACTION` → `router.publishEvent(modelId, eventType, event)`
 *   (only this store's model receives it).
 * - `ESP_BROADCAST_ACTION` → `router.broadcastEvent(eventType, event)`
 *   (every registered model that observes `eventType` receives it).
 * - Every other action passes through untouched.
 *
 * The routed event comes back through the bridge as a normal action, so the
 * reducer handles local and routed events the same way.
 *
 * Replaces the original `applyESPMiddleware(modelId, dispatch)`, which was
 * called during render and created (and leaked) a new bridge model on every
 * render. Registration now lives in an effect (`useEspBridge`) with cleanup.
 */
export function createEspMiddleware<S, A>(options: EspMiddlewareOptions): Middleware<S, A> {
  const { router, modelId, onError, onRoute } = options;
  return () => (next) => (action) => {
    if (!isEspOutgoingAction(action)) {
      next(action);
      return;
    }
    const { eventType, event } = action.payload;
    try {
      if (action.type === types.PUBLISH_ACTION) {
        onRoute?.({ kind: 'publish', eventType, event });
        router.publishEvent(modelId, eventType, event);
      } else {
        onRoute?.({ kind: 'broadcast', eventType, event });
        router.broadcastEvent(eventType, event);
      }
    } catch (error) {
      if (onError) onError(error, action);
      else console.error('[esp middleware] Failed to route event', eventType, error);
    }
  };
}
