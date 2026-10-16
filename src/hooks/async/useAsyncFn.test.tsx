import { act, renderHook } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { fetchJson } from './fetchJson';
import { useAsyncFn, type AsyncFnOutcome } from './useAsyncFn';

interface SearchResult {
  query: string;
  results: string[];
}

const search = (signal: AbortSignal, q: string) =>
  fetchJson<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`, { signal });

describe('useAsyncFn', () => {
  it('starts idle and runs only when executed', async () => {
    const { result } = renderHook(() => useAsyncFn(search));
    expect(result.current.status).toBe('idle');

    let promise: Promise<AsyncFnOutcome<SearchResult>> | undefined;
    act(() => {
      promise = result.current.execute('java');
    });
    expect(result.current.status).toBe('pending');
    let outcome: AsyncFnOutcome<SearchResult> | undefined;
    await act(async () => {
      outcome = await promise;
    });
    expect(outcome).toMatchObject({ status: 'success' });
    expect(result.current.status).toBe('success');
    expect(result.current.data?.results).toContain('Java');
  });

  it('latest call wins even when the earlier response arrives last (MSW race)', async () => {
    // /api/search is slower for shorter queries: "ja" (360ms) resolves after "jav" (240ms).
    server.use(
      http.get('/api/search', async ({ request }) => {
        const q = new URL(request.url).searchParams.get('q') ?? '';
        await delay(q === 'ja' ? 80 : 10);
        return HttpResponse.json({ query: q, results: [q] });
      }),
    );
    const { result } = renderHook(() => useAsyncFn(search));
    let first: AsyncFnOutcome<SearchResult> | undefined;
    let second: AsyncFnOutcome<SearchResult> | undefined;
    await act(async () => {
      const a = result.current.execute('ja');
      const b = result.current.execute('jav');
      [first, second] = await Promise.all([a, b]);
    });
    expect(first).toEqual({ status: 'aborted' });
    expect(second).toMatchObject({ status: 'success' });
    expect(result.current.data?.query).toBe('jav');
  });

  it('passes an AbortSignal that cancel() aborts and restores the previous state', async () => {
    const signals: AbortSignal[] = [];
    const { result } = renderHook(() =>
      useAsyncFn((signal: AbortSignal, value: number) => {
        signals.push(signal);
        return value === 1 ? Promise.resolve(1) : new Promise<number>(() => {});
      }),
    );
    await act(async () => {
      await result.current.execute(1);
    });
    act(() => {
      void result.current.execute(2);
    });
    expect(result.current).toMatchObject({ status: 'pending', data: 1 });
    act(() => result.current.cancel());
    expect(signals[1]?.aborted).toBe(true);
    expect(result.current).toMatchObject({ status: 'success', data: 1 });
  });

  it('resolves errors instead of rejecting', async () => {
    const { result } = renderHook(() =>
      useAsyncFn((signal: AbortSignal) =>
        fetchJson('/api/todos', {
          method: 'POST',
          body: JSON.stringify({ title: 'fail' }),
          signal,
        }),
      ),
    );
    let outcome: AsyncFnOutcome<unknown> | undefined;
    await act(async () => {
      outcome = await result.current.execute();
    });
    expect(outcome?.status).toBe('error');
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toContain('500');
  });

  it('aborts on unmount and never updates state afterwards', async () => {
    let signal: AbortSignal | undefined;
    const { result, unmount } = renderHook(() =>
      useAsyncFn((s: AbortSignal) => {
        signal = s;
        return new Promise<string>((resolve) => setTimeout(() => resolve('late'), 10));
      }),
    );
    let promise: Promise<AsyncFnOutcome<string>> | undefined;
    act(() => {
      promise = result.current.execute();
    });
    unmount();
    expect(signal?.aborted).toBe(true);
    await expect(promise).resolves.toEqual({ status: 'aborted' });
    expect(result.current.status).toBe('pending');
  });

  it('reset() returns to idle; callbacks are stable', async () => {
    const { result, rerender } = renderHook(() => useAsyncFn(() => Promise.resolve('x')));
    const { execute, cancel, reset } = result.current;
    await act(async () => {
      await result.current.execute();
    });
    rerender();
    expect(result.current.execute).toBe(execute);
    expect(result.current.cancel).toBe(cancel);
    act(() => reset());
    expect(result.current.status).toBe('idle');
  });
});
