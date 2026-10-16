import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimeout } from './useTimeout';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts on mount, fires once and stops being pending', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout(callback, 100));
    expect(result.current.isPending).toBe(true);
    advance(100);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
    advance(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not auto-start with autoStart: false; start() is idempotent', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout(callback, 100, { autoStart: false }));
    expect(result.current.isPending).toBe(false);
    act(() => result.current.start());
    advance(60);
    act(() => result.current.start()); // already running: no restart
    advance(40);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('clear() cancels and reset() restarts from now', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout(callback, 100));
    act(() => result.current.clear());
    expect(result.current.isPending).toBe(false);
    advance(200);
    expect(callback).not.toHaveBeenCalled();

    act(() => result.current.reset());
    advance(80);
    act(() => result.current.reset());
    advance(80);
    expect(callback).not.toHaveBeenCalled();
    advance(20);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('is disabled by a null delay', () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(({ delay }) => useTimeout(callback, delay), {
      initialProps: { delay: 100 as number | null },
    });
    rerender({ delay: null });
    expect(result.current.isPending).toBe(false);
    act(() => result.current.start());
    advance(500);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts with a new delay', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(({ delay }) => useTimeout(callback, delay), {
      initialProps: { delay: 100 },
    });
    advance(50);
    rerender({ delay: 300 });
    advance(299);
    expect(callback).not.toHaveBeenCalled();
    advance(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('calls the latest callback and clears the timer on unmount', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ fn }) => useTimeout(fn, 100), {
      initialProps: { fn: first },
    });
    rerender({ fn: second });
    advance(100);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    const late = vi.fn();
    const other = renderHook(() => useTimeout(late, 100));
    other.unmount();
    unmount();
    advance(500);
    expect(late).not.toHaveBeenCalled();
  });
});
