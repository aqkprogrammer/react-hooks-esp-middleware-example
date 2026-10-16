import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createReducerStore } from './createReducerStore';
import type { Middleware } from './types';
import { useReducerWithMiddleware } from './useReducerWithMiddleware';

type Action = { type: 'add'; amount: number } | { type: 'reset' };
const reducer = (state: number, action: Action) =>
  action.type === 'add' ? state + action.amount : 0;

describe('reducer middleware', () => {
  it('runs middleware outermost-first and exposes the new state after next()', () => {
    const calls: string[] = [];
    const tracer =
      (name: string): Middleware<number, Action> =>
      ({ getState }) =>
      (next) =>
      (action) => {
        calls.push(`${name}:before:${getState()}`);
        next(action);
        calls.push(`${name}:after:${getState()}`);
      };
    const store = createReducerStore(reducer, 0, [tracer('a'), tracer('b')]);
    store.dispatch({ type: 'add', amount: 2 });
    expect(calls).toEqual(['a:before:0', 'b:before:0', 'b:after:2', 'a:after:2']);
  });

  it('lets middleware swallow actions by not calling next()', () => {
    const blockNegative: Middleware<number, Action> = () => (next) => (action) => {
      if (action.type === 'add' && action.amount < 0) return;
      next(action);
    };
    const store = createReducerStore(reducer, 1, [blockNegative]);
    store.dispatch({ type: 'add', amount: -5 });
    expect(store.getState()).toBe(1);
  });

  it('routes api.dispatch through the full chain', () => {
    const seen: Action['type'][] = [];
    const record: Middleware<number, Action> = () => (next) => (action) => {
      seen.push(action.type);
      next(action);
    };
    const resetOnTen: Middleware<number, Action> = (api) => (next) => (action) => {
      next(action);
      if (api.getState() >= 10) api.dispatch({ type: 'reset' });
    };
    const store = createReducerStore(reducer, 0, [record, resetOnTen]);
    store.dispatch({ type: 'add', amount: 10 });
    expect(seen).toEqual(['add', 'reset']);
    expect(store.getState()).toBe(0);
  });

  it('re-renders the component and keeps dispatch stable', () => {
    const { result } = renderHook(() => useReducerWithMiddleware(reducer, 0));
    const dispatch = result.current[1];
    act(() => dispatch({ type: 'add', amount: 3 }));
    expect(result.current[0]).toBe(3);
    expect(result.current[1]).toBe(dispatch);
  });
});
