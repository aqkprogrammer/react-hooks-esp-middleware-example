import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import { createAnalyticsMiddleware, type AnalyticsEvent } from './analytics';

type Action =
  | { type: 'add'; name: string }
  | { type: 'remove'; name: string }
  | { type: 'hover'; name: string };
const reducer = (state: string[], action: Action) => {
  switch (action.type) {
    case 'add':
      return [...state, action.name];
    case 'remove':
      return state.includes(action.name) ? state.filter((name) => name !== action.name) : state;
    case 'hover':
      return state;
  }
};

describe('createAnalyticsMiddleware', () => {
  it('maps only configured actions to events, built from the next state', () => {
    const tracked: AnalyticsEvent[] = [];
    const store = createReducerStore<string[], Action>(
      reducer,
      [],
      [
        createAnalyticsMiddleware<string[], Action>({
          track: (event) => tracked.push(event),
          events: {
            add: (action, next) => ({
              name: 'Item Added',
              properties: { item: action.name, count: next.length },
            }),
            // Skip removals that did nothing.
            remove: (action, next, prev) =>
              next === prev ? null : { name: 'Item Removed', properties: { item: action.name } },
          },
        }),
      ],
    );
    store.dispatch({ type: 'add', name: 'tea' });
    store.dispatch({ type: 'hover', name: 'tea' });
    store.dispatch({ type: 'remove', name: 'coffee' });
    store.dispatch({ type: 'remove', name: 'tea' });
    expect(tracked).toEqual([
      { name: 'Item Added', properties: { item: 'tea', count: 1 } },
      { name: 'Item Removed', properties: { item: 'tea' } },
    ]);
  });

  it('never lets a failing tracker break dispatch', () => {
    const onError = vi.fn();
    const store = createReducerStore<string[], Action>(
      reducer,
      [],
      [
        createAnalyticsMiddleware<string[], Action>({
          track: () => {
            throw new Error('blocked by an ad blocker');
          },
          events: { add: () => ({ name: 'Item Added' }) },
          onError,
        }),
      ],
    );
    store.dispatch({ type: 'add', name: 'tea' });
    expect(store.getState()).toEqual(['tea']);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { type: 'add', name: 'tea' });
  });

  it('warns on the console by default', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createReducerStore<string[], Action>(
      reducer,
      [],
      [
        createAnalyticsMiddleware<string[], Action>({
          track: () => {
            throw new Error('nope');
          },
          events: { add: () => ({ name: 'Item Added' }) },
        }),
      ],
    );
    store.dispatch({ type: 'add', name: 'tea' });
    expect(warn).toHaveBeenCalledWith('[analytics]', expect.any(Error));
  });
});
