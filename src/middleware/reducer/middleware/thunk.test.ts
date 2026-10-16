import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import type { Middleware } from '../types';
import { createThunkMiddleware, isThunk, type Thunk, type ThunkActionOf } from './thunk';

interface State {
  status: 'idle' | 'loading' | 'done';
  value: number;
}
type Action = { type: 'start' } | { type: 'done'; value: number };
type Dispatchable = ThunkActionOf<State, Action>;

const reducer = (state: State, action: Dispatchable): State => {
  if (isThunk(action)) return state;
  return action.type === 'start'
    ? { ...state, status: 'loading' }
    : { status: 'done', value: action.value };
};

describe('createThunkMiddleware', () => {
  it('runs functions with dispatch and getState instead of passing them on', () => {
    const reducerSpy = vi.fn(reducer);
    const store = createReducerStore<State, Dispatchable>(
      reducerSpy,
      { status: 'idle', value: 0 },
      [createThunkMiddleware<State, Action>()],
    );
    const thunk: Thunk<State, Action> = (dispatch, getState) => {
      dispatch({ type: 'start' });
      expect(getState().status).toBe('loading');
      dispatch({ type: 'done', value: 42 });
    };
    store.dispatch(thunk);
    expect(store.getState()).toEqual({ status: 'done', value: 42 });
    expect(reducerSpy.mock.calls.map(([, action]) => action)).toEqual([
      { type: 'start' },
      { type: 'done', value: 42 },
    ]);
  });

  it('supports async thunks that dispatch on completion', async () => {
    const store = createReducerStore<State, Dispatchable>(reducer, { status: 'idle', value: 0 }, [
      createThunkMiddleware<State, Action>(),
    ]);
    let finish: (value: number) => void = () => {};
    store.dispatch(async (dispatch) => {
      dispatch({ type: 'start' });
      const value = await new Promise<number>((resolve) => (finish = resolve));
      dispatch({ type: 'done', value });
    });
    expect(store.getState().status).toBe('loading');
    finish(7);
    await vi.waitFor(() => expect(store.getState()).toEqual({ status: 'done', value: 7 }));
  });

  it('routes actions dispatched by a thunk through the whole chain', () => {
    const seen: string[] = [];
    const recorder: Middleware<State, Dispatchable> = () => (next) => (action) => {
      seen.push(isThunk(action) ? 'thunk' : action.type);
      next(action);
    };
    const store = createReducerStore<State, Dispatchable>(reducer, { status: 'idle', value: 0 }, [
      recorder,
      createThunkMiddleware<State, Action>(),
    ]);
    store.dispatch((dispatch) => dispatch({ type: 'start' }));
    expect(seen).toEqual(['thunk', 'start']);
  });

  it('passes the extra argument and allows nested thunks', () => {
    const api = { load: vi.fn(() => 5) };
    type Extra = typeof api;
    type WithExtra = ThunkActionOf<State, Action, Extra>;
    const store = createReducerStore<State, WithExtra>(
      (state, action) => (typeof action === 'function' ? state : reducer(state, action)),
      { status: 'idle', value: 0 },
      [createThunkMiddleware<State, Action, Extra>(api)],
    );
    const inner: Thunk<State, Action, Extra> = (dispatch, _getState, extra) =>
      dispatch({ type: 'done', value: extra.load() });
    store.dispatch((dispatch) => dispatch(inner));
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(store.getState().value).toBe(5);
  });
});
