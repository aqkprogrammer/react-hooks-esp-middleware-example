import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../test/server';
import { computeBackoff, sleep } from './backoff';
import { HttpError, isTransientError } from './errors';
import { fetchJson } from './fetchJson';
import { useRetry } from './useRetry';

interface Flaky {
  message: string;
  attempt: number;
}

describe('computeBackoff', () => {
  it('grows exponentially and is capped', () => {
    const exact = { jitter: 'none' as const, baseDelayMs: 100, maxDelayMs: 1000 };
    expect([1, 2, 3, 4, 5].map((n) => computeBackoff(n, exact))).toEqual([
      100, 200, 400, 800, 1000,
    ]);
  });

  it('applies full and equal jitter', () => {
    expect(computeBackoff(3, { baseDelayMs: 100 }, () => 0.5)).toBe(200);
    expect(computeBackoff(3, { baseDelayMs: 100, jitter: 'equal' }, () => 0)).toBe(200);
    expect(computeBackoff(3, { baseDelayMs: 100, jitter: 'equal' }, () => 1)).toBe(400);
  });
});

describe('isTransientError', () => {
  it('retries network, 5xx, 408 and 429 but not other 4xx', () => {
    const http = (status: number) => new HttpError({ status, statusText: '', url: '' }, null);
    expect(isTransientError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransientError(http(503))).toBe(true);
    expect(isTransientError(http(429))).toBe(true);
    expect(isTransientError(http(404))).toBe(false);
    expect(isTransientError(new Error('bug'))).toBe(false);
  });
});

describe('useRetry (fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retries the flaky endpoint with backoff until it succeeds', async () => {
    // Bypass MSW's network delay so only backoff timers matter.
    server.use(
      http.get('/api/flaky', ({ request }) => {
        const attempt = Number(new URL(request.url).searchParams.get('attempt'));
        return attempt < 3
          ? HttpResponse.json({ message: 'fail', attempt }, { status: 503 })
          : HttpResponse.json({ message: 'ok', attempt });
      }),
    );
    const onRetry = vi.fn();
    const { result } = renderHook(() =>
      useRetry((signal, attempt) => fetchJson<Flaky>(`/api/flaky?attempt=${attempt}`, { signal }), {
        maxAttempts: 4,
        baseDelayMs: 100,
        jitter: 'none',
        onRetry,
      }),
    );

    await act(async () => {
      void result.current.run();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({ status: 'waiting', attempt: 1, nextRetryInMs: 100 });

    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(result.current).toMatchObject({ status: 'waiting', attempt: 2, nextRetryInMs: 200 });

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(result.current).toMatchObject({ status: 'success', attempt: 3 });
    expect(result.current.data?.message).toBe('ok');
    expect(onRetry.mock.calls.map(([event]) => event.delayMs)).toEqual([100, 200]);
  });

  it('gives up after maxAttempts', async () => {
    const fn = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const { result } = renderHook(() =>
      useRetry(fn, { maxAttempts: 2, baseDelayMs: 50, jitter: 'none' }),
    );
    await act(async () => {
      void result.current.run();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: 'error', attempt: 2 });
  });

  it('does not retry errors rejected by the predicate', async () => {
    const fn = vi.fn(() =>
      Promise.reject(new HttpError({ status: 400, statusText: 'Bad', url: '' }, null)),
    );
    const { result } = renderHook(() => useRetry(fn, { maxAttempts: 5 }));
    await act(async () => {
      await result.current.run();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('error');
  });

  it('cancel() aborts the signal and clears the pending backoff timer', async () => {
    const signals: AbortSignal[] = [];
    const fn = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return Promise.reject(new TypeError('offline'));
    });
    const { result } = renderHook(() => useRetry(fn, { baseDelayMs: 1000, jitter: 'none' }));
    await act(async () => {
      void result.current.run();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('waiting');
    act(() => result.current.cancel());
    expect(signals[0]?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });

  it('stops retrying on unmount', async () => {
    const fn = vi.fn(() => Promise.reject(new TypeError('offline')));
    const { result, unmount } = renderHook(() => useRetry(fn, { baseDelayMs: 100 }));
    await act(async () => {
      void result.current.run();
      await vi.advanceTimersByTimeAsync(0);
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('useRetry against the real flaky mock', () => {
  it('succeeds on the third attempt', async () => {
    const { result } = renderHook(() =>
      useRetry(
        (signal) => fetchJson<Flaky>('/api/flaky?key=hook-test&failures=2&delay=0', { signal }),
        { baseDelayMs: 1, maxDelayMs: 5 },
      ),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current).toMatchObject({ status: 'success', attempt: 3 });
    expect(result.current.data?.attempt).toBe(3);
  });
});

describe('sleep', () => {
  it('rejects with the abort reason', async () => {
    const controller = new AbortController();
    const promise = sleep(1000, controller.signal);
    controller.abort(new Error('stop'));
    await expect(promise).rejects.toThrow('stop');
  });
});
