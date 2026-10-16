import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from './createReducerStore';
import { useStoreSelector } from './useStoreSelector';

interface State {
  a: number;
  b: number;
}
type Action = { type: 'a' } | { type: 'b' };
const reducer = (state: State, action: Action): State =>
  action.type === 'a' ? { ...state, a: state.a + 1 } : { ...state, b: state.b + 1 };
const selectA = (state: State) => state.a;

describe('useStoreSelector', () => {
  it('re-renders only when the selected slice changes', () => {
    const store = createReducerStore(reducer, { a: 0, b: 0 });
    const renders = vi.fn();
    function ShowA() {
      renders();
      return <output>{useStoreSelector(store, selectA)}</output>;
    }
    render(<ShowA />);
    expect(renders).toHaveBeenCalledTimes(1);
    act(() => store.dispatch({ type: 'b' }));
    expect(renders).toHaveBeenCalledTimes(1);
    act(() => store.dispatch({ type: 'a' }));
    expect(screen.getByRole('status')).toHaveTextContent('1');
    expect(renders).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes on unmount', () => {
    const store = createReducerStore(reducer, { a: 0, b: 0 });
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((listener: () => void) => {
      const off = store.subscribe(listener);
      return () => {
        unsubscribe();
        off();
      };
    });
    const { unmount } = renderHook(() =>
      useStoreSelector({ getState: store.getState, subscribe }, selectA),
    );
    expect(subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
