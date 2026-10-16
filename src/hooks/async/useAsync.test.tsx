import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsync } from './useAsync';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsync', () => {
  it('is pending on the first render and resolves to success', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42), []));
    expect(result.current.status).toBe('pending');
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe(42);
  });

  it('exposes errors as Error instances', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject('boom'), []));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
  });

  it('catches synchronous throws', async () => {
    const { result } = renderHook(() =>
      useAsync<number>(() => {
        throw new Error('sync');
      }, []),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('sync');
  });

  it('ignores a stale result that resolves after a newer one (race)', async () => {
    const slow = deferred<string>();
    const fast = deferred<string>();
    const calls: Record<string, ReturnType<typeof deferred<string>>> = { a: slow, b: fast };
    const { result, rerender } = renderHook(({ id }) => useAsync(() => calls[id]!.promise, [id]), {
      initialProps: { id: 'a' },
    });
    rerender({ id: 'b' });
    expect(result.current.status).toBe('pending');

    await act(async () => fast.resolve('B'));
    expect(result.current).toMatchObject({ status: 'success', data: 'B' });

    await act(async () => slow.resolve('A'));
    expect(result.current.data).toBe('B');
  });

  it('aborts the previous signal when deps change and on unmount', () => {
    const signals: AbortSignal[] = [];
    const { rerender, unmount } = renderHook(
      ({ id }) =>
        useAsync(
          (signal) => {
            signals.push(signal);
            return new Promise<never>(() => {});
          },
          [id],
        ),
      { initialProps: { id: 1 } },
    );
    rerender({ id: 2 });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    unmount();
    expect(signals[1]?.aborted).toBe(true);
  });

  it('does not update state after unmount', async () => {
    const pending = deferred<number>();
    const errorSpy = vi.spyOn(console, 'error');
    const { result, unmount } = renderHook(() => useAsync(() => pending.promise, []));
    const before = result.current;
    unmount();
    await act(async () => pending.resolve(1));
    expect(result.current).toBe(before);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not re-run when only the function identity changes', async () => {
    const fn = vi.fn(() => Promise.resolve('x'));
    const { rerender, result } = renderHook(() => useAsync(() => fn(), ['same']));
    await waitFor(() => expect(result.current.status).toBe('success'));
    rerender();
    rerender();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('is idle and aborts when disabled', async () => {
    const signals: AbortSignal[] = [];
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useAsync(
          (signal) => {
            signals.push(signal);
            return new Promise<never>(() => {});
          },
          [],
          { enabled },
        ),
      { initialProps: { enabled: false } },
    );
    expect(result.current.status).toBe('idle');
    expect(signals).toHaveLength(0);
    rerender({ enabled: true });
    expect(result.current.status).toBe('pending');
    rerender({ enabled: false });
    expect(signals[0]?.aborted).toBe(true);
    expect(result.current.status).toBe('idle');
  });

  it('reload() runs again and keepPreviousData keeps data while pending', async () => {
    let count = 0;
    const { result } = renderHook(() =>
      useAsync(() => Promise.resolve(++count), [], { keepPreviousData: true }),
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    expect(result.current).toMatchObject({ status: 'pending', data: 1 });
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 2 }));
  });

  it('clears data while pending by default', async () => {
    const { result, rerender } = renderHook(({ id }) => useAsync(() => Promise.resolve(id), [id]), {
      initialProps: { id: 1 },
    });
    await waitFor(() => expect(result.current.data).toBe(1));
    rerender({ id: 2 });
    expect(result.current).toMatchObject({ status: 'pending', data: undefined });
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
