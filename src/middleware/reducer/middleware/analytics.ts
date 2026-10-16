import type { Middleware } from '../types';
import { findHandler, type HandlersByType } from './actionTypes';

/** A vendor-neutral analytics event (map it to Segment, GA4, PostHog, ... in `track`). */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * Per action type: build the event from the (narrowed) action and the state
 * *after* the reducer ran, or return `null` to skip this occurrence.
 */
export type AnalyticsEventMap<S, A> = HandlersByType<
  A,
  [nextState: S, prevState: S],
  AnalyticsEvent | null | undefined
>;

export interface AnalyticsOptions<S, A> {
  /** Sends the event. Injected so tests and the playground can capture events. */
  track: (event: AnalyticsEvent) => void;
  /** Which actions produce events. Action types missing from the map are ignored. */
  events: AnalyticsEventMap<S, A>;
  /**
   * Called when building or sending an event throws. Analytics must never
   * break the app, so errors are always caught. Defaults to `console.warn`.
   */
  onError?: (error: unknown, action: A) => void;
}

/**
 * Maps selected actions to analytics events.
 *
 * Events are produced *after* `next(action)` so they describe what actually
 * happened: an action swallowed by a later middleware (or that left the state
 * unchanged) still produces an event unless the mapper returns `null` — use
 * `nextState`/`prevState` to decide. Put validation *before* this middleware
 * so rejected actions are never tracked.
 */
export function createAnalyticsMiddleware<S, A>(options: AnalyticsOptions<S, A>): Middleware<S, A> {
  const { track, events, onError = (error) => console.warn('[analytics]', error) } = options;
  return (api) => (next) => (action) => {
    const prevState = api.getState();
    next(action);
    const toEvent = findHandler(events, action);
    if (!toEvent) return;
    try {
      const event = toEvent(action, api.getState(), prevState);
      if (event) track(event);
    } catch (error) {
      onError(error, action);
    }
  };
}
