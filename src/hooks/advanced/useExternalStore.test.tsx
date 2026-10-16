import { act, render, renderHook, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from './createStore';
import { shallowEqualObjects, useExternalStore } from './useExternalStore';

interface Shop {
  count: number;
  name: string;
  items: string[];
}

const makeStore = () => createStore<Shop>({ count: 0, name: 'Ada', items: [] });

describe('createStore', () => {
  it('merges patches, notifies listeners with (state, previous) and skips no-ops', () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, name: 'Ada', items: [] });
    expect(listener).toHaveBeenLastCalledWith(
      store.getState(),
      expect.objectContaining({ count: 0 }),
    );

    store.setState((state) => state);
    expect(listener).toHaveBeenCalledTimes(1);

    store.setState({ count: 9, name: 'Grace', items: ['x'] }, true);
    expect(store.getState()).toEqual({ count: 9, name: 'Grace', items: ['x'] });
    expect(store.getInitialState()).toEqual({ count: 0, name: 'Ada', items: [] });

    unsubscribe();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('supports an initializer with actions', () => {
    const store = createStore<{ count: number; increment: () => void }>((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }));
    store.getState().increment();
    store.getState().increment();
    expect(store.getState().count).toBe(2);
  });
});

describe('useExternalStore', () => {
  it('returns the whole state without a selector', () => {
    const store = makeStore();
    const { result } = renderHook(() => useExternalStore(store));
    act(() => store.setState({ name: 'Linus' }));
    expect(result.current.name).toBe('Linus');
  });

  it('re-renders only when the selected slice changes', () => {
    const store = makeStore();
    const commits = { count: 0, name: 0 };
    function Count() {
      const count = useExternalStore(store, (state) => state.count);
      return <p>count: {count}</p>;
    }
    function Name() {
      const name = useExternalStore(store, (state) => state.name);
      return <p>name: {name}</p>;
    }
    render(
      <>
        <Profiler id="count" onRender={() => (commits.count += 1)}>
          <Count />
        </Profiler>
        <Profiler id="name" onRender={() => (commits.name += 1)}>
          <Name />
        </Profiler>
      </>,
    );
    expect(commits).toEqual({ count: 1, name: 1 });

    act(() => store.setState({ name: 'Grace' }));
    expect(screen.getByText('name: Grace')).toBeInTheDocument();
    expect(commits).toEqual({ count: 1, name: 2 });

    act(() => store.setState((state) => ({ count: state.count + 1 })));
    expect(screen.getByText('count: 1')).toBeInTheDocument();
    expect(commits).toEqual({ count: 2, name: 2 });
  });

  it('uses the equality function for derived objects/arrays', () => {
    const store = makeStore();
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useExternalStore(
        store,
        (state) => ({ count: state.count, upper: state.name.toUpperCase() }),
        shallowEqualObjects,
      );
    });
    const first = result.current;
    const before = renders;

    act(() => store.setState({ items: ['unrelated'] }));
    expect(renders).toBe(before);
    expect(result.current).toBe(first);

    act(() => store.setState({ name: 'grace' }));
    expect(result.current).toEqual({ count: 0, upper: 'GRACE' });
  });

  it('without an equality function, a new object every time would re-render', () => {
    const store = makeStore();
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useExternalStore(store, (state) => ({ count: state.count }));
    });
    const before = renders;
    act(() => store.setState({ name: 'other' }));
    expect(renders).toBeGreaterThan(before);
  });

  it('unsubscribes on unmount', () => {
    const store = makeStore();
    const original = store.subscribe;
    const unsubscribed = vi.fn();
    vi.spyOn(store, 'subscribe').mockImplementation((listener) => {
      const off = original(listener);
      return () => {
        unsubscribed();
        off();
      };
    });
    const { unmount } = renderHook(() => useExternalStore(store, (state) => state.count));
    expect(store.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribed).toHaveBeenCalledTimes(1);
  });
});

describe('shallowEqualObjects', () => {
  it('compares one level deep', () => {
    expect(shallowEqualObjects({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
    expect(shallowEqualObjects({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqualObjects({ a: {} }, { a: {} })).toBe(false);
    expect(shallowEqualObjects([1, 2], [1, 2])).toBe(true);
    expect(shallowEqualObjects([1], { 0: 1 })).toBe(false);
    expect(shallowEqualObjects(null, {})).toBe(false);
  });
});
