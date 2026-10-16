import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSubscription, type SubscriptionSource } from './useSubscription';

function createCounterSource(initial = 0) {
  let value = initial;
  const listeners = new Set<() => void>();
  const source: SubscriptionSource<number> = {
    subscribe: vi.fn((onChange: () => void) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    }),
    getCurrentValue: () => value,
  };
  return {
    source,
    listeners,
    set(next: number) {
      value = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

describe('useSubscription', () => {
  it('reads the current value and re-renders on change', () => {
    const counter = createCounterSource(1);
    const { result } = renderHook(() => useSubscription(counter.source));
    expect(result.current).toBe(1);
    counter.set(2);
    expect(result.current).toBe(2);
  });

  it('unsubscribes on unmount and subscribes once for a stable source', () => {
    const counter = createCounterSource();
    const { rerender, unmount } = renderHook(() => useSubscription(counter.source));
    rerender();
    rerender();
    expect(counter.source.subscribe).toHaveBeenCalledTimes(1);
    expect(counter.listeners.size).toBe(1);
    unmount();
    expect(counter.listeners.size).toBe(0);
  });

  it('switches subscriptions when the source changes', () => {
    const a = createCounterSource(1);
    const b = createCounterSource(10);
    const { result, rerender } = renderHook(({ source }) => useSubscription(source), {
      initialProps: { source: a.source },
    });
    rerender({ source: b.source });
    expect(result.current).toBe(10);
    expect(a.listeners.size).toBe(0);
    expect(b.listeners.size).toBe(1);
  });

  it('keeps the previous reference when isEqual says nothing changed', () => {
    let state = { x: 1, y: 2 };
    const listeners = new Set<() => void>();
    const source: SubscriptionSource<{ x: number }> = {
      subscribe: (onChange) => {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      // A fresh object on every call: without isEqual this would loop forever.
      getCurrentValue: () => ({ x: state.x }),
    };
    const isEqual = (a: { x: number }, b: { x: number }) => a.x === b.x;
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useSubscription(source, { isEqual });
    });
    const first = result.current;
    const rendersBefore = renders;

    state = { ...state, y: 3 };
    act(() => listeners.forEach((listener) => listener()));
    expect(result.current).toBe(first);
    expect(renders).toBe(rendersBefore);

    state = { ...state, x: 5 };
    act(() => listeners.forEach((listener) => listener()));
    expect(result.current).toEqual({ x: 5 });
  });

  it('calls methods on class-based sources with the right this', () => {
    class Clock {
      private now = 42;
      subscribe() {
        return () => {};
      }
      getCurrentValue() {
        return this.now;
      }
    }
    const { result } = renderHook(() => useSubscription(new Clock()));
    expect(result.current).toBe(42);
  });
});
