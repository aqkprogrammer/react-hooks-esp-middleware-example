import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately and later values after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');
    rerender({ value: 'ab' });
    advance(100);
    rerender({ value: 'abc' });
    advance(199);
    expect(result.current).toBe('a');
    advance(1);
    expect(result.current).toBe('abc');
  });

  it('settles on the published value when the value changes back', () => {
    let renders = 0;
    const { result, rerender } = renderHook(
      ({ value }) => {
        renders += 1;
        return useDebounce(value, 200);
      },
      { initialProps: { value: 1 } },
    );
    rerender({ value: 2 });
    rerender({ value: 1 });
    const rendersBefore = renders;
    advance(500);
    expect(result.current).toBe(1);
    expect(renders).toBe(rendersBefore); // the trailing update bailed out
  });

  it('does not schedule anything on mount', () => {
    renderHook(() => useDebounce('x', 200));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('publishes at least every maxWait while the value keeps changing', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100, { maxWait: 300 }),
      { initialProps: { value: 0 } },
    );
    for (let i = 1; i <= 8; i += 1) {
      rerender({ value: i });
      advance(50);
    }
    expect(result.current).toBeGreaterThan(0);
  });

  it('stores function values instead of calling them', () => {
    const first = () => 'first';
    const second = () => 'second';
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 50), {
      initialProps: { value: first },
    });
    rerender({ value: second });
    advance(50);
    expect(result.current).toBe(second);
  });

  it('clears its timer on unmount', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
