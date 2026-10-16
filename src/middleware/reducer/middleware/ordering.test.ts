/**
 * Middleware order is behaviour: the same middleware in a different order
 * produce different results. These tests pin down the order used by the
 * playground's pipeline demo and show what goes wrong when it changes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import type { Middleware } from '../types';
import { createAnalyticsMiddleware, type AnalyticsEvent } from './analytics';
import { createErrorReportingMiddleware } from './errorReporting';
import { createLogger, describeAction } from './logger';
import { createPersistenceMiddleware } from './persistence';
import { createThunkMiddleware, isThunk, type ThunkActionOf } from './thunk';
import { createValidationMiddleware } from './validation';

interface State {
  items: string[];
  error: string | null;
}
type Action =
  | { type: 'add'; item: string }
  | { type: 'invalid'; message: string }
  | { type: 'crash' }
  | { type: 'failed'; message: string };
type Dispatchable = ThunkActionOf<State, Action>;
type M = Middleware<State, Dispatchable>;

const reducer = (state: State, action: Dispatchable): State => {
  if (isThunk(action)) return state;
  switch (action.type) {
    case 'add':
      return { items: [...state.items, action.item], error: null };
    case 'invalid':
    case 'failed':
      return { ...state, error: action.message };
    case 'crash':
      throw new Error('reducer crashed');
  }
};
const initial: State = { items: [], error: null };

/** Records "<name>:<action>" when an action enters a middleware. */
const trace =
  (calls: string[], name: string): M =>
  () =>
  (next) =>
  (action) => {
    calls.push(`${name}:${describeAction(action)}`);
    next(action);
  };

function setup(
  order: Array<'errors' | 'thunk' | 'logger' | 'validation' | 'analytics' | 'persist'>,
) {
  const calls: string[] = [];
  const logged: string[] = [];
  const tracked: AnalyticsEvent[] = [];
  const storage = new Map<string, string>();
  const build: Record<(typeof order)[number], M> = {
    errors: createErrorReportingMiddleware<State, Dispatchable>({
      report: () => {},
      toAction: (error) => ({ type: 'failed', message: String(error) }),
    }),
    thunk: createThunkMiddleware<State, Action>(),
    logger: createLogger<State, Dispatchable>({
      sink: (r) => logged.push(describeAction(r.action)),
    }),
    validation: createValidationMiddleware<State, Dispatchable>({
      validators: { add: (action) => (action.item ? null : { item: 'required' }) },
      onInvalid: (errors) => ({ type: 'invalid', message: errors.item ?? 'invalid' }),
    }),
    analytics: createAnalyticsMiddleware<State, Dispatchable>({
      track: (event) => tracked.push(event),
      events: { add: (action) => ({ name: 'Item Added', properties: { item: action.item } }) },
    }),
    persist: createPersistenceMiddleware<State, Dispatchable, string[]>({
      key: 'items',
      select: (state) => state.items,
      getStorage: () => ({
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => void storage.set(key, value),
      }),
      debounceMs: 0,
    }),
  };
  const middleware = order.flatMap((name) => [trace(calls, name), build[name]]);
  const store = createReducerStore<State, Dispatchable>(reducer, initial, middleware);
  return { store, calls, logged, tracked, storage };
}

const recommended = ['errors', 'thunk', 'logger', 'validation', 'analytics', 'persist'] as const;

describe('middleware ordering', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('passes a valid action through every middleware in array order', () => {
    const { store, calls, logged, tracked, storage } = setup([...recommended]);
    store.dispatch({ type: 'add', item: 'tea' });
    vi.runAllTimers();
    expect(calls).toEqual([
      'errors:add',
      'thunk:add',
      'logger:add',
      'validation:add',
      'analytics:add',
      'persist:add',
    ]);
    expect(logged).toEqual(['add']);
    expect(tracked).toEqual([{ name: 'Item Added', properties: { item: 'tea' } }]);
    expect(storage.get('items')).toBe('["tea"]');
  });

  it('stops invalid actions at validation and re-enters the chain with the failure', () => {
    const { store, calls, logged, tracked } = setup([...recommended]);
    store.dispatch({ type: 'add', item: '' });
    expect(calls).toEqual([
      'errors:add',
      'thunk:add',
      'logger:add',
      'validation:add',
      // validation dispatches `invalid` from the top of the chain
      'errors:invalid',
      'thunk:invalid',
      'logger:invalid',
      'validation:invalid',
      'analytics:invalid',
      'persist:invalid',
    ]);
    // The logger emits after next() returns, so the nested failure logs first.
    expect(logged).toEqual(['invalid', 'add']);
    expect(tracked).toEqual([]);
    expect(store.getState()).toEqual({ items: [], error: 'required' });
  });

  it('expands thunks before the logger, so only plain actions are logged', () => {
    const { store, logged } = setup([...recommended]);
    store.dispatch((dispatch) => dispatch({ type: 'add', item: 'tea' }));
    expect(logged).toEqual(['add']);
  });

  it('catches reducer errors from any position, but only later middleware errors', () => {
    const first = setup([...recommended]);
    first.store.dispatch({ type: 'crash' });
    expect(first.store.getState().error).toBe('Error: reducer crashed');

    // The reducer runs inside every middleware, so even a last-place error
    // reporter catches its crash...
    const last = setup(['thunk', 'logger', 'validation', 'analytics', 'persist', 'errors']);
    last.store.dispatch({ type: 'crash' });
    expect(last.store.getState().error).toBe('Error: reducer crashed');

    // ...but a crash in a middleware placed *before* it escapes to the caller.
    const store = createReducerStore<State, Dispatchable>(reducer, initial, [
      createLogger<State, Dispatchable>({
        sink: () => {
          throw new Error('sink crashed');
        },
      }),
      createErrorReportingMiddleware<State, Dispatchable>({ report: () => {} }),
    ]);
    expect(() => store.dispatch({ type: 'add', item: 'x' })).toThrow('sink crashed');
  });

  it('tracks rejected actions when analytics runs before validation', () => {
    const { store, tracked } = setup([
      'errors',
      'thunk',
      'logger',
      'analytics',
      'validation',
      'persist',
    ]);
    store.dispatch({ type: 'add', item: '' });
    expect(tracked).toEqual([{ name: 'Item Added', properties: { item: '' } }]);
  });

  it('lets thunks reach the reducer unexpanded when thunk is placed last', () => {
    const { store, logged } = setup([
      'errors',
      'logger',
      'validation',
      'analytics',
      'persist',
      'thunk',
    ]);
    store.dispatch((dispatch) => dispatch({ type: 'add', item: 'tea' }));
    // The logger saw the function itself, then the action it dispatched.
    expect(logged).toEqual(['add', 'thunk']);
  });
});
