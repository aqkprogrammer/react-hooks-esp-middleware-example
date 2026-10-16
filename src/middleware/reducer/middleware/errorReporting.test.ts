import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import type { Middleware } from '../types';
import { createErrorReportingMiddleware, type ErrorReport } from './errorReporting';

interface State {
  count: number;
  error: string | null;
}
type Action = { type: 'inc' } | { type: 'explode' } | { type: 'error'; message: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'inc':
      return { ...state, count: state.count + 1 };
    case 'explode':
      throw new Error('reducer bug');
    case 'error':
      return { ...state, error: action.message };
  }
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

describe('createErrorReportingMiddleware', () => {
  it('reports reducer errors, keeps the last good state and dispatches an error action', () => {
    const reports: ErrorReport<State, Action>[] = [];
    const store = createReducerStore<State, Action>(reducer, { count: 1, error: null }, [
      createErrorReportingMiddleware<State, Action>({
        report: (report) => reports.push(report),
        toAction: (error) => ({ type: 'error', message: message(error) }),
      }),
    ]);
    expect(() => store.dispatch({ type: 'explode' })).not.toThrow();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ action: { type: 'explode' }, state: { count: 1 } });
    expect(store.getState()).toEqual({ count: 1, error: 'reducer bug' });
    store.dispatch({ type: 'inc' });
    expect(store.getState().count).toBe(2);
  });

  it('catches errors thrown by later middleware', () => {
    const report = vi.fn();
    const broken: Middleware<State, Action> = () => () => () => {
      throw new Error('middleware bug');
    };
    const store = createReducerStore<State, Action>(reducer, { count: 0, error: null }, [
      createErrorReportingMiddleware<State, Action>({ report }),
      broken,
    ]);
    store.dispatch({ type: 'inc' });
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(Error) }));
  });

  it('cannot see errors from middleware placed before it', () => {
    const report = vi.fn();
    const broken: Middleware<State, Action> = () => () => () => {
      throw new Error('outer bug');
    };
    const store = createReducerStore<State, Action>(reducer, { count: 0, error: null }, [
      broken,
      createErrorReportingMiddleware<State, Action>({ report }),
    ]);
    expect(() => store.dispatch({ type: 'inc' })).toThrow('outer bug');
    expect(report).not.toHaveBeenCalled();
  });

  it('re-throws when asked to', () => {
    const report = vi.fn();
    const store = createReducerStore<State, Action>(reducer, { count: 0, error: null }, [
      createErrorReportingMiddleware<State, Action>({ report, rethrow: true }),
    ]);
    expect(() => store.dispatch({ type: 'explode' })).toThrow('reducer bug');
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('reports but does not loop when the error action throws too', () => {
    const report = vi.fn();
    const store = createReducerStore<State, Action>(reducer, { count: 0, error: null }, [
      createErrorReportingMiddleware<State, Action>({
        report,
        toAction: () => ({ type: 'explode' }),
      }),
    ]);
    store.dispatch({ type: 'explode' });
    expect(report).toHaveBeenCalledTimes(2);
    expect(store.getState()).toEqual({ count: 0, error: null });
  });
});
