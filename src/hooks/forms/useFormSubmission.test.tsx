import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFormSubmission, type SubmissionOutcome } from './useFormSubmission';

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe('useFormSubmission', () => {
  it('goes idle → submitting → success and calls onSuccess', async () => {
    const response = deferred<{ id: number }>();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useFormSubmission((name: string) => response.promise.then((data) => ({ ...data, name })), {
        onSuccess,
      }),
    );
    expect(result.current.status).toBe('idle');

    let outcome: Promise<SubmissionOutcome<{ id: number; name: string }>> | undefined;
    act(() => {
      outcome = result.current.submit('Ada');
    });
    expect(result.current.status).toBe('submitting');
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      response.resolve({ id: 1 });
      await outcome;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual({ id: 1, name: 'Ada' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Ada' });
    await expect(outcome).resolves.toEqual({ status: 'success', data: { id: 1, name: 'Ada' } });
  });

  it('ignores a second submit while one is in flight (double click)', async () => {
    const response = deferred<string>();
    const submitFn = vi.fn(() => response.promise);
    const { result } = renderHook(() => useFormSubmission(submitFn));
    let first: Promise<SubmissionOutcome<string>> | undefined;
    let second: Promise<SubmissionOutcome<string>> | undefined;
    act(() => {
      // Both calls happen before React re-renders.
      first = result.current.submit();
      second = result.current.submit();
    });
    await expect(second).resolves.toEqual({ status: 'skipped' });
    expect(submitFn).toHaveBeenCalledTimes(1);
    await act(async () => {
      response.resolve('ok');
      await first;
    });
    // After completion a new submission is allowed again.
    await act(async () => {
      await result.current.submit();
    });
    expect(submitFn).toHaveBeenCalledTimes(2);
  });

  it('captures errors and clears them on the next attempt', async () => {
    const onError = vi.fn();
    let fail = true;
    const { result } = renderHook(() =>
      useFormSubmission(
        async () => {
          if (fail) throw new Error('Server said no');
          return 'ok';
        },
        { onError },
      ),
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('Server said no');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server said no' }));

    fail = false;
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeUndefined();
  });

  it('abort() cancels the signal, returns to idle and ignores the late result', async () => {
    const response = deferred<string>();
    let signal: AbortSignal | undefined;
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useFormSubmission(
        (_args: void, s: AbortSignal) => {
          signal = s;
          return response.promise;
        },
        { onSuccess },
      ),
    );
    let outcome: Promise<SubmissionOutcome<string>> | undefined;
    act(() => {
      outcome = result.current.submit();
    });
    act(() => result.current.abort());
    expect(signal?.aborted).toBe(true);
    expect(result.current.status).toBe('idle');
    await act(async () => {
      response.resolve('late');
      await outcome;
    });
    await expect(outcome).resolves.toEqual({ status: 'aborted' });
    expect(result.current.status).toBe('idle');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('treats an AbortError that is not ours as a failure', async () => {
    const { result } = renderHook(() =>
      useFormSubmission(async () => {
        throw new DOMException('Upstream aborted', 'AbortError');
      }),
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.status).toBe('error');
  });

  it('aborts on unmount and never calls callbacks afterwards', async () => {
    const response = deferred<string>();
    let signal: AbortSignal | undefined;
    const onSuccess = vi.fn();
    const { result, unmount } = renderHook(() =>
      useFormSubmission(
        (_args: void, s: AbortSignal) => {
          signal = s;
          return response.promise;
        },
        { onSuccess },
      ),
    );
    let outcome: Promise<SubmissionOutcome<string>> | undefined;
    act(() => {
      outcome = result.current.submit();
    });
    unmount();
    expect(signal?.aborted).toBe(true);
    response.resolve('late');
    await expect(outcome).resolves.toEqual({ status: 'aborted' });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('reset clears data and error', async () => {
    const { result } = renderHook(() => useFormSubmission(async () => 'saved'));
    await act(async () => {
      await result.current.submit();
    });
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ status: 'idle', data: undefined, error: undefined });
  });
});
