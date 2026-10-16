import { act, renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { describe, expect, it } from 'vitest';
import {
  clearHistory,
  createUndoableState,
  isUndoableAction,
  redo,
  undo,
  undoable,
} from './undoable';

type Action = { type: 'add'; amount: number } | { type: 'select'; id: number } | { type: 'noop' };
interface State {
  total: number;
  selected: number | null;
}
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'add':
      return { ...state, total: state.total + action.amount };
    case 'select':
      return { ...state, selected: action.id };
    case 'noop':
      return state;
  }
};
const start: State = { total: 0, selected: null };

describe('undoable', () => {
  it('records changes and moves through past and future', () => {
    const enhanced = undoable(reducer);
    let state = createUndoableState(start);
    state = enhanced(state, { type: 'add', amount: 1 });
    state = enhanced(state, { type: 'add', amount: 2 });
    expect(state.present.total).toBe(3);
    expect(state.past.map((s) => s.total)).toEqual([0, 1]);

    state = enhanced(state, undo());
    expect(state.present.total).toBe(1);
    expect(state.future.map((s) => s.total)).toEqual([3]);
    state = enhanced(state, undo());
    state = enhanced(state, redo());
    expect(state.present.total).toBe(1);
    expect(state.past.map((s) => s.total)).toEqual([0]);
    expect(state.future.map((s) => s.total)).toEqual([3]);
  });

  it('clears the future on a new change and ignores no-op actions', () => {
    const enhanced = undoable(reducer);
    let state = enhanced(createUndoableState(start), { type: 'add', amount: 1 });
    state = enhanced(state, undo());
    const before = state;
    expect(enhanced(state, { type: 'noop' })).toBe(before);
    state = enhanced(state, { type: 'add', amount: 5 });
    expect(state.future).toEqual([]);
    expect(state.present.total).toBe(5);
  });

  it('returns the same state for undo/redo with nothing to do', () => {
    const enhanced = undoable(reducer);
    const state = createUndoableState(start);
    expect(enhanced(state, undo())).toBe(state);
    expect(enhanced(state, redo())).toBe(state);
    expect(enhanced(state, clearHistory())).toBe(state);
  });

  it('caps history at the limit', () => {
    const enhanced = undoable(reducer, { limit: 2 });
    let state = createUndoableState(start);
    for (let i = 0; i < 5; i += 1) state = enhanced(state, { type: 'add', amount: 1 });
    expect(state.past.map((s) => s.total)).toEqual([3, 4]);
    expect(() => undoable(reducer, { limit: 0 })).toThrow(RangeError);
  });

  it('updates present without history for unrecorded actions', () => {
    const enhanced = undoable(reducer, { shouldRecord: (action) => action.type !== 'select' });
    let state = enhanced(createUndoableState(start), { type: 'add', amount: 1 });
    state = enhanced(state, { type: 'select', id: 7 });
    expect(state.present).toEqual({ total: 1, selected: 7 });
    expect(state.past).toHaveLength(1);
  });

  it('clears history but keeps the present', () => {
    const enhanced = undoable(reducer);
    let state = enhanced(createUndoableState(start), { type: 'add', amount: 1 });
    state = enhanced(state, clearHistory());
    expect(state).toEqual({ past: [], present: { total: 1, selected: null }, future: [] });
  });

  it('works with plain useReducer', () => {
    const enhanced = undoable(reducer);
    const { result } = renderHook(() => useReducer(enhanced, createUndoableState(start)));
    act(() => result.current[1]({ type: 'add', amount: 4 }));
    act(() => result.current[1](undo()));
    expect(result.current[0].present.total).toBe(0);
    expect(result.current[0].future).toHaveLength(1);
  });

  it('recognises its own actions', () => {
    expect(isUndoableAction(undo())).toBe(true);
    expect(isUndoableAction({ type: 'add' })).toBe(false);
    expect(isUndoableAction(null)).toBe(false);
  });
});
