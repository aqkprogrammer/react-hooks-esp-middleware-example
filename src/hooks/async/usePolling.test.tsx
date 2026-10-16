import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDocumentVisibility } from '../../test/browserMocks';
import { usePolling } from './usePolling';

function controllable() {
  const calls: Array<{
    signal: AbortSignal;
    resolve: (value: number) => void;
    reject: (error: unknown) => void;
  }> = [];
  const fn = vi.fn(
    (signal: AbortSignal) =>
      new Promise<number>((resolve, reject) => calls.push({ signal, resolve, reject })),
  );
  return { fn, calls };
}

describe('usePolling', () => {
  let restoreVisibility: (() => void) | undefined;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    restoreVisibility?.();
    restoreVisibility = undefined;
    vi.useRealTimers();
  });

  it('polls immediately, then intervalMs after each response settles (no overlap)', async () => {
    const { fn, calls } = controllable();
    const { result } = renderHook(() => usePolling(fn, { intervalMs: 1000 }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.isFetching).toBe(true);

    // A slow response: no second request however long we wait.
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => calls[0]?.resolve(1));
    expect(result.current).toMatchObject({ data: 1, isFetching: false });
    await act(() => vi.advanceTimersByTimeAsync(999));
    expect(fn).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps the last data when a poll fails and keeps polling', async () => {
    const { fn, calls } = controllable();
    const { result } = renderHook(() => usePolling(fn, { intervalMs: 100 }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(async () => calls[0]?.resolve(7));
    await act(() => vi.advanceTimersByTimeAsync(100));
    await act(async () => calls[1]?.reject(new Error('503')));
    expect(result.current.data).toBe(7);
    expect(result.current.error?.message).toBe('503');
    await act(() => vi.advanceTimersByTimeAsync(100));
    await act(async () => calls[2]?.resolve(8));
    expect(result.current).toMatchObject({ data: 8, error: undefined });
  });

  it('pauses while the page is hidden and polls again when visible', async () => {
    const { fn, calls } = controllable();
    const { result } = renderHook(() => usePolling(fn, { intervalMs: 100 }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    restoreVisibility = setDocumentVisibility('hidden');
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(result.current.isPaused).toBe(true);
    expect(result.current.isFetching).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(fn).toHaveBeenCalledTimes(1);

    restoreVisibility();
    restoreVisibility = setDocumentVisibility('visible');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.isPaused).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps polling in the background when pauseWhenHidden is false', async () => {
    const { fn } = controllable();
    renderHook(() => usePolling(fn, { intervalMs: 100, pauseWhenHidden: false }));
    restoreVisibility = setDocumentVisibility('hidden');
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('refresh() aborts the request in flight and polls now', async () => {
    const { fn, calls } = controllable();
    const { result } = renderHook(() => usePolling(fn, { intervalMs: 1000 }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => result.current.refresh());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops on disable and on unmount: aborts and clears timers', async () => {
    const { fn, calls } = controllable();
    const { rerender, unmount } = renderHook(
      ({ enabled }) => usePolling(fn, { intervalMs: 100, enabled }),
      { initialProps: { enabled: true } },
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    rerender({ enabled: false });
    expect(calls[0]?.signal.aborted).toBe(true);
    rerender({ enabled: true });
    await act(() => vi.advanceTimersByTimeAsync(0));
    unmount();
    expect(calls[1]?.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
