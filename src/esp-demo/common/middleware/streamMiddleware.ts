import { Subscription, of, type Observable } from 'rxjs';
import type { Middleware } from '../../../middleware/reducer/types';

export type StreamHandler<A> = (input: Observable<A>) => Observable<A>;
export type StreamHandlerMap<A> = Partial<Record<string, StreamHandler<A>>>;

export const ACTION_TYPES = {
  ERROR: 'UNEXPECTED_ERROR',
} as const;

export interface StreamMiddleware<S, A> {
  middleware: Middleware<S, A>;
  /** Unsubscribes every running stream (call on unmount). */
  dispose: () => void;
  /** Number of streams currently running (for display/tests). */
  activeCount: () => number;
}

/**
 * RxJS "epic"-style middleware from the original example (`useStream`).
 *
 * For actions that have a handler, the action is passed on to the reducer
 * and also fed into `handler(of(action))`; every action emitted by the
 * returned observable is dispatched. Errors become `UNEXPECTED_ERROR`.
 *
 * Fixes over the original: subscriptions are tracked per store instead of in
 * a module-level array shared by every tile, completed streams are removed,
 * and `dispose()` cleans up on unmount.
 */
export function createStreamMiddleware<S, A extends { type: string }>(
  map: StreamHandlerMap<A>,
  options: { cancelAllActionType?: string; toError: (error: unknown) => A },
): StreamMiddleware<S, A> {
  const subscriptions = new Set<Subscription>();
  const cancelAll = () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    subscriptions.clear();
  };

  const middleware: Middleware<S, A> = (api) => (next) => (action) => {
    next(action);
    const handler = map[action.type];
    if (handler) {
      const subscription = new Subscription();
      subscriptions.add(subscription);
      subscription.add(
        handler(of(action)).subscribe({
          next: (result) => api.dispatch(result),
          error: (error: unknown) => {
            subscriptions.delete(subscription);
            api.dispatch(options.toError(error));
          },
          complete: () => subscriptions.delete(subscription),
        }),
      );
      if (subscription.closed) subscriptions.delete(subscription);
    }
    if (options.cancelAllActionType && action.type === options.cancelAllActionType) {
      cancelAll();
    }
  };

  return { middleware, dispose: cancelAll, activeCount: () => subscriptions.size };
}
