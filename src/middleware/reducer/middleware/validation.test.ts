import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import type { Middleware } from '../types';
import { createValidationMiddleware, type ValidationErrors } from './validation';

interface State {
  names: string[];
  errors: ValidationErrors;
}
type Action =
  | { type: 'add'; name: string }
  | { type: 'reset' }
  | { type: 'invalid'; errors: ValidationErrors; rejected: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'add':
      return { names: [...state.names, action.name], errors: {} };
    case 'reset':
      return { names: [], errors: {} };
    case 'invalid':
      return { ...state, errors: action.errors };
  }
};

const validation = createValidationMiddleware<State, Action>({
  validators: {
    add: (action, state) => {
      if (!action.name.trim()) return { name: 'Name is required' };
      if (state.names.includes(action.name)) return { name: `${action.name} already exists` };
      return null;
    },
    reset: () => ({}),
  },
  onInvalid: (errors, rejected) => ({
    type: 'invalid',
    errors,
    rejected: (rejected as { type: string }).type,
  }),
});

describe('createValidationMiddleware', () => {
  it('passes valid actions and treats empty error objects as valid', () => {
    const store = createReducerStore<State, Action>(reducer, { names: [], errors: {} }, [
      validation,
    ]);
    store.dispatch({ type: 'add', name: 'Ada' });
    store.dispatch({ type: 'reset' });
    expect(store.getState()).toEqual({ names: [], errors: {} });
  });

  it('swallows invalid actions and dispatches the failure action through the chain', () => {
    const seen: string[] = [];
    const recorder: Middleware<State, Action> = () => (next) => (action) => {
      seen.push(action.type);
      next(action);
    };
    const store = createReducerStore<State, Action>(reducer, { names: ['Ada'], errors: {} }, [
      recorder,
      validation,
    ]);
    store.dispatch({ type: 'add', name: 'Ada' });
    expect(store.getState()).toEqual({ names: ['Ada'], errors: { name: 'Ada already exists' } });
    expect(seen).toEqual(['add', 'invalid']);
  });

  it('validates against the current state, not a captured one', () => {
    const store = createReducerStore<State, Action>(reducer, { names: [], errors: {} }, [
      validation,
    ]);
    store.dispatch({ type: 'add', name: 'Grace' });
    store.dispatch({ type: 'add', name: 'Grace' });
    expect(store.getState().names).toEqual(['Grace']);
    expect(store.getState().errors).toEqual({ name: 'Grace already exists' });
  });

  it('throws instead of looping when the failure action is itself invalid', () => {
    const looping = createValidationMiddleware<State, Action>({
      validators: { invalid: () => ({ any: 'always invalid' }), add: () => ({ name: 'bad' }) },
      onInvalid: (errors) => ({ type: 'invalid', errors, rejected: 'add' }),
    });
    const onReducer = vi.fn(reducer);
    const store = createReducerStore<State, Action>(onReducer, { names: [], errors: {} }, [
      looping,
    ]);
    expect(() => store.dispatch({ type: 'add', name: 'x' })).toThrow(/itself invalid/);
    expect(onReducer).not.toHaveBeenCalled();
  });
});
