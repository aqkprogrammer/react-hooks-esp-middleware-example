import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedCallback, type UseDebouncedCallbackOptions } from './useDebouncedCallback';

const setup = (delay = 100, options: UseDebouncedCallbackOptions = {}) => {
  const callback = vi.fn<(value: string) => void>();
  const hook = renderHook(({ delay: d, options: o }) => useDebouncedCallback(callback, d, o), {
    initialProps: { delay, options },
  });
  return { callback, ...hook };
};

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useDebouncedCallback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('invokes once on the trailing edge with the latest arguments', () => {
    const { result, callback } = setup(100);
    result.current('a');
    advance(50);
    result.current('b');
    advance(99);
    expect(callback).not.toHaveBeenCalled();
    advance(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('b');
  });

  it('supports the leading edge (with and without trailing)', () => {
    const both = setup(100, { leading: true });
    both.result.current('a');
    expect(both.callback).toHaveBeenCalledWith('a');
    both.result.current('b');
    advance(100);
    expect(both.callback.mock.calls).toEqual([['a'], ['b']]);

    const leadingOnly = setup(100, { leading: true, trailing: false });
    leadingOnly.result.current('x');
    leadingOnly.result.current('y');
    advance(200);
    expect(leadingOnly.callback.mock.calls).toEqual([['x']]);
  });

  it('does not invoke twice for a single call with leading + trailing', () => {
    const { result, callback } = setup(100, { leading: true });
    result.current('only');
    advance(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('honours maxWait during a continuous burst', () => {
    const { result, callback } = setup(100, { maxWait: 250 });
    for (let i = 0; i < 10; i += 1) {
      result.current(`call ${i}`);
      advance(50);
    }
    // 500ms of calls every 50ms: without maxWait nothing would have run yet.
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('cancels, flushes and reports pending state', () => {
    const { result, callback } = setup(100);
    result.current('a');
    expect(result.current.isPending()).toBe(true);
    result.current.cancel();
    expect(result.current.isPending()).toBe(false);
    advance(200);
    expect(callback).not.toHaveBeenCalled();

    result.current('b');
    result.current.flush();
    expect(callback).toHaveBeenCalledWith('b');
    expect(result.current.isPending()).toBe(false);
    advance(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable identity and always calls the latest callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 100), {
      initialProps: { fn: first },
    });
    const debounced = result.current;
    debounced();
    rerender({ fn: second });
    expect(result.current).toBe(debounced);
    advance(100);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('never invokes after unmount and clears its timer', () => {
    const { result, callback, unmount } = setup(100);
    result.current('a');
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    result.current('late call from a stale handler');
    advance(500);
    expect(callback).not.toHaveBeenCalled();
  });

  it('re-evaluates a pending call when the delay changes', () => {
    const longer = setup(100);
    longer.result.current('a');
    advance(50);
    longer.rerender({ delay: 300, options: {} });
    advance(100); // 150ms after the call: the old delay would have fired
    expect(longer.callback).not.toHaveBeenCalled();
    advance(150);
    expect(longer.callback).toHaveBeenCalledTimes(1);

    const shorter = setup(1000);
    shorter.result.current('b');
    advance(100);
    shorter.rerender({ delay: 50, options: {} });
    advance(0);
    expect(shorter.callback).toHaveBeenCalledWith('b');
  });

  it('uses a new delay for subsequent calls', () => {
    const { result, callback, rerender } = setup(100);
    rerender({ delay: 20, options: {} });
    result.current('fast');
    advance(20);
    expect(callback).toHaveBeenCalledWith('fast');
  });
});
