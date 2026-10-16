import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThrottledCallback } from './useThrottledCallback';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useThrottledCallback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs immediately, then at most once per interval with the latest args', () => {
    const callback = vi.fn<(n: number) => void>();
    const { result } = renderHook(() => useThrottledCallback(callback, 100));
    result.current(1);
    expect(callback.mock.calls).toEqual([[1]]);
    result.current(2);
    result.current(3);
    advance(100);
    expect(callback.mock.calls).toEqual([[1], [3]]);
  });

  it('invokes regularly during a continuous stream of calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 100));
    for (let i = 0; i < 20; i += 1) {
      result.current();
      advance(25);
    }
    // 500ms of calls → leading call + one per 100ms interval.
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(callback.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('respects leading: false and trailing: false', () => {
    const noLeading = vi.fn();
    const a = renderHook(() => useThrottledCallback(noLeading, 100, { leading: false }));
    a.result.current();
    expect(noLeading).not.toHaveBeenCalled();
    advance(100);
    expect(noLeading).toHaveBeenCalledTimes(1);

    const noTrailing = vi.fn();
    const b = renderHook(() => useThrottledCallback(noTrailing, 100, { trailing: false }));
    b.result.current();
    b.result.current();
    advance(100);
    expect(noTrailing).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useThrottledCallback(callback, 100));
    result.current();
    result.current();
    unmount();
    advance(500);
    expect(callback).toHaveBeenCalledTimes(1); // only the leading call
  });
});
