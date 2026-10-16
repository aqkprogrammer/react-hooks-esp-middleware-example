import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOptimisticMutation, type OptimisticMutationOutcome } from './useOptimisticMutation';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Likes = Record<string, number>;
const addLike = (state: Likes, id: string) => ({ ...state, [id]: (state[id] ?? 0) + 1 });

function setup(overrides: { onError?: () => void; onSuccess?: () => void } = {}) {
  const calls: Array<{ id: string; request: Deferred<number>; signal: AbortSignal }> = [];
  const hook = renderHook(() =>
    useOptimisticMutation<Likes, string, number>({
      initialState: { a: 0, b: 0 },
      mutationFn: (id, signal) => {
        const request = deferred<number>();
        calls.push({ id, request, signal });
        return request.promise;
      },
      applyOptimistic: addLike,
      // The server returns the authoritative count.
      applyResult: (state, count, id) => ({ ...state, [id]: count }),
      ...overrides,
    }),
  );
  return { ...hook, calls };
}

describe('useOptimisticMutation', () => {
  it('applies the change immediately and confirms it with the server result', async () => {
    const onSuccess = vi.fn();
    const { result, calls } = setup({ onSuccess });
    let outcome: Promise<OptimisticMutationOutcome<number>> | undefined;
    act(() => {
      outcome = result.current.mutate('a');
    });
    expect(result.current.state).toEqual({ a: 1, b: 0 });
    expect(result.current.confirmedState).toEqual({ a: 0, b: 0 });
    expect(result.current.isPending).toBe(true);

    await act(async () => calls[0]?.request.resolve(10));
    await expect(outcome).resolves.toEqual({ ok: true, result: 10 });
    expect(result.current.state).toEqual({ a: 10, b: 0 });
    expect(result.current.isPending).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith(10, 'a');
  });

  it('rolls back a failed mutation without clobbering a concurrent one', async () => {
    const onError = vi.fn();
    const { result, calls } = setup({ onError });
    act(() => {
      void result.current.mutate('a');
      void result.current.mutate('b');
    });
    expect(result.current.state).toEqual({ a: 1, b: 1 });

    // The first request fails *after* the second was applied optimistically.
    await act(async () => calls[0]?.request.reject(new Error('rejected')));
    expect(result.current.state).toEqual({ a: 0, b: 1 });
    expect(result.current.error?.message).toBe('rejected');
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'a');

    await act(async () => calls[1]?.request.resolve(1));
    expect(result.current.state).toEqual({ a: 0, b: 1 });
    expect(result.current.error).toBeNull();
  });

  it('handles out-of-order completion', async () => {
    const { result, calls } = setup();
    act(() => {
      void result.current.mutate('a');
      void result.current.mutate('a');
    });
    expect(result.current.state.a).toBe(2);
    await act(async () => calls[1]?.request.resolve(2));
    expect(result.current.state.a).toBe(3); // confirmed 2 + first still pending
    await act(async () => calls[0]?.request.resolve(2));
    expect(result.current.state.a).toBe(2);
    expect(result.current.pending).toEqual([]);
  });

  it('never rejects: failures resolve with ok: false', async () => {
    const { result, calls } = setup();
    let outcome: Promise<OptimisticMutationOutcome<number>> | undefined;
    act(() => {
      outcome = result.current.mutate('b');
    });
    await act(async () => calls[0]?.request.reject('plain string'));
    const settled = await outcome;
    expect(settled?.ok).toBe(false);
  });

  it('re-applies pending mutations on top of setConfirmed', () => {
    const { result } = setup();
    act(() => {
      void result.current.mutate('a');
    });
    act(() => result.current.setConfirmed({ a: 100, b: 5 }));
    expect(result.current.state).toEqual({ a: 101, b: 5 });
    act(() => result.current.setConfirmed((previous) => ({ ...previous, b: 6 })));
    expect(result.current.confirmedState).toEqual({ a: 100, b: 6 });
  });

  it('dismissError clears the last error', async () => {
    const { result, calls } = setup();
    act(() => {
      void result.current.mutate('a');
    });
    await act(async () => calls[0]?.request.reject(new Error('x')));
    act(() => result.current.dismissError());
    expect(result.current.error).toBeNull();
  });

  it('aborts in-flight mutations on unmount and skips callbacks', async () => {
    const onError = vi.fn();
    const { result, calls, unmount } = setup({ onError });
    let outcome: Promise<OptimisticMutationOutcome<number>> | undefined;
    act(() => {
      outcome = result.current.mutate('a');
    });
    unmount();
    expect(calls[0]?.signal.aborted).toBe(true);
    calls[0]?.request.reject(new DOMException('Aborted', 'AbortError'));
    await waitFor(async () => expect((await outcome)?.ok).toBe(false));
    expect(onError).not.toHaveBeenCalled();
  });
});
