import {
  combineSlices,
  configureStore,
  createListenerMiddleware,
  createSelector,
  isAction,
  isAnyOf,
  type Middleware,
} from '@reduxjs/toolkit';
import { dismissed, notificationsSlice, notified } from './notificationsSlice';
import { addTodo, todosSlice } from './todosSlice';

export const rootReducer = combineSlices(todosSlice, notificationsSlice);
export type RootState = ReturnType<typeof rootReducer>;

export const NOTIFICATION_TTL_MS = 4000;

/**
 * A hand-written Redux middleware (same `api => next => action` shape as the
 * playground's reducer middleware). In Redux 5 `action` is `unknown`, so it
 * narrows with `isAction` before reading `type`.
 */
export function createAuditMiddleware(sink: (line: string) => void): Middleware<object, RootState> {
  return (api) => (next) => (action) => {
    const result = next(action);
    if (isAction(action)) {
      sink(`${action.type} → ${api.getState().todos.items.length} todo(s)`);
    }
    return result;
  };
}

/**
 * Creates an isolated store. The demo calls it once per mount (never a
 * module-level singleton), so every render — and every test — starts fresh.
 */
export function makeStore(options: { audit?: (line: string) => void } = {}) {
  // Per-store listener middleware: side effects that react to actions.
  const listener = createListenerMiddleware();
  listener.startListening({
    matcher: isAnyOf(addTodo.fulfilled, addTodo.rejected),
    effect: (action, api) => {
      if (addTodo.fulfilled.match(action)) {
        api.dispatch(notified('success', `Added "${action.payload.title}"`));
      } else if (addTodo.rejected.match(action)) {
        api.dispatch(notified('danger', action.payload ?? 'Could not add the todo'));
      }
    },
  });
  // Async listener: auto-dismiss each notification after a delay.
  listener.startListening({
    actionCreator: notified,
    effect: async (action, api) => {
      await api.delay(NOTIFICATION_TTL_MS);
      api.dispatch(dismissed(action.payload.id));
    },
  });

  return configureStore({
    reducer: rootReducer,
    // RTK's docs prepend the listener middleware: it can receive actions
    // carrying functions, so it must run before the serializability check.
    // The audit log goes last so it sees the final state.
    middleware: (getDefaultMiddleware) => {
      const defaults = getDefaultMiddleware().prepend(listener.middleware);
      return options.audit ? defaults.concat(createAuditMiddleware(options.audit)) : defaults;
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

/** Memoised derived data: recomputes only when items or filter change. */
export const selectVisibleTodos = createSelector(
  [(state: RootState) => state.todos.items, (state: RootState) => state.todos.filter],
  (items, filter) =>
    filter === 'all' ? items : items.filter((todo) => todo.completed === (filter === 'done')),
);
