import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThrottle } from './useThrottle';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useThrottle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('publishes the first change immediately and the latest at the end of the interval', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 100), {
      initialProps: { value: 0 },
    });
    rerender({ value: 1 });
    expect(result.current).toBe(1);
    rerender({ value: 2 });
    rerender({ value: 3 });
    expect(result.current).toBe(1);
    advance(100);
    expect(result.current).toBe(3);
  });

  it('updates regularly while the value keeps changing', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 100), {
      initialProps: { value: 0 },
    });
    const seen = new Set<number>();
    for (let i = 1; i <= 20; i += 1) {
      rerender({ value: i });
      advance(25);
      seen.add(result.current);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('publishes the latest value even when it changes back', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 100), {
      initialProps: { value: 0 },
    });
    rerender({ value: 1 });
    rerender({ value: 0 });
    expect(result.current).toBe(1);
    advance(100);
    expect(result.current).toBe(0);
  });

  it('supports leading: false', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 100, { leading: false }),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    advance(100);
    expect(result.current).toBe('b');
  });

  it('clears its timer on unmount', () => {
    const { rerender, unmount } = renderHook(({ value }) => useThrottle(value, 100), {
      initialProps: { value: 0 },
    });
    rerender({ value: 1 });
    rerender({ value: 2 });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
