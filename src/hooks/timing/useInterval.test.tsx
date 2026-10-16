import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInterval } from './useInterval';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useInterval', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls the callback every delay ms', () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 100));
    advance(350);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('pauses with null and resumes', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 100 as number | null },
    });
    advance(100);
    rerender({ delay: null });
    expect(vi.getTimerCount()).toBe(0);
    advance(500);
    expect(callback).toHaveBeenCalledTimes(1);
    rerender({ delay: 50 });
    advance(100);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('calls the latest callback without restarting the interval', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ fn }) => useInterval(fn, 100), {
      initialProps: { fn: first },
    });
    advance(60);
    rerender({ fn: second });
    advance(40); // would be 60ms into a new interval if it had restarted
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('restarts when the delay changes and clears on unmount', () => {
    const callback = vi.fn();
    const { rerender, unmount } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 100 },
    });
    advance(90);
    rerender({ delay: 200 });
    advance(190);
    expect(callback).not.toHaveBeenCalled();
    advance(10);
    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
