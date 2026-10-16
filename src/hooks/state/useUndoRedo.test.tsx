import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { undoRedoReducer, useUndoRedo } from './useUndoRedo';

describe('useUndoRedo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('records history and undoes/redoes', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.set(1));
    act(() => result.current.set((n) => n + 1));
    expect(result.current.present).toBe(2);
    expect(result.current.past).toEqual([0, 1]);

    act(() => result.current.undo());
    expect(result.current.present).toBe(1);
    expect(result.current.future).toEqual([2]);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.present).toBe(2);
    expect(result.current.canRedo).toBe(false);
  });

  it('clears the redo stack when a new value is set', () => {
    const { result } = renderHook(() => useUndoRedo('a'));
    act(() => result.current.set('b'));
    act(() => result.current.undo());
    act(() => result.current.set('c'));
    expect(result.current.future).toEqual([]);
    expect(result.current.past).toEqual(['a']);
  });

  it('ignores Object.is-equal values and undo/redo at the ends', () => {
    const { result } = renderHook(() => useUndoRedo(1));
    const before = result.current.past;
    act(() => {
      result.current.set(1);
      result.current.undo();
      result.current.redo();
    });
    expect(result.current.past).toBe(before);
    expect(result.current.present).toBe(1);
  });

  it('drops the oldest steps beyond the limit', () => {
    const { result } = renderHook(() => useUndoRedo(0, { limit: 2 }));
    act(() => {
      result.current.set(1);
      result.current.set(2);
      result.current.set(3);
    });
    expect(result.current.past).toEqual([1, 2]);
  });

  it('coalesces bursts with the same key within the window', () => {
    const { result } = renderHook(() => useUndoRedo('', { coalesceWindowMs: 500 }));
    act(() => result.current.set('h', { coalesceKey: 'typing' }));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.set('hi', { coalesceKey: 'typing' }));
    expect(result.current.past).toEqual(['']);

    act(() => vi.advanceTimersByTime(600)); // pause longer than the window
    act(() => result.current.set('hi!', { coalesceKey: 'typing' }));
    expect(result.current.past).toEqual(['', 'hi']);

    act(() => result.current.set('hi!?', { coalesceKey: 'other' }));
    expect(result.current.past).toEqual(['', 'hi', 'hi!']);

    act(() => result.current.undo());
    expect(result.current.present).toBe('hi!');
    // Undo breaks the group: the next keystroke is a new step.
    act(() => result.current.set('hi!!', { coalesceKey: 'other' }));
    expect(result.current.past).toEqual(['', 'hi', 'hi!']);
  });

  it('resets to the initial value or a new one', () => {
    const { result } = renderHook(() => useUndoRedo({ n: 0 }));
    act(() => result.current.set({ n: 1 }));
    act(() => result.current.reset());
    expect(result.current.present).toEqual({ n: 0 });
    expect(result.current.past).toEqual([]);
    act(() => result.current.reset({ n: 9 }));
    expect(result.current.present).toEqual({ n: 9 });
  });

  it('keeps actions stable', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    const { set, undo, redo, reset } = result.current;
    act(() => result.current.set(1));
    expect(result.current.set).toBe(set);
    expect(result.current.undo).toBe(undo);
    expect(result.current.redo).toBe(redo);
    expect(result.current.reset).toBe(reset);
  });

  it('exposes a pure reducer', () => {
    const state = { past: [], present: 1, future: [], group: null };
    const action = {
      type: 'set',
      next: 2,
      coalesceKey: undefined,
      at: 0,
      limit: Infinity,
      windowMs: 0,
    } as const;
    expect(undoRedoReducer(state, action)).toEqual(undoRedoReducer(state, action));
    expect(state.present).toBe(1);
  });
});
