import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../test/server';
import { fetchJson } from './fetchJson';
import { createRequestCache, useRequest, type RequestCache } from './useRequest';

interface Todo {
  id: string;
  title: string;
}

const getTodos = (url: string) => fetchJson<Todo[]>(url);

function TodoCount({ cache }: { cache: RequestCache }) {
  const { data, isLoading } = useRequest('/api/todos', getTodos, { cache });
  return <p>{isLoading ? 'loading' : `${data?.length ?? 0} todos`}</p>;
}

describe('useRequest', () => {
  it('deduplicates concurrent requests for the same key', async () => {
    const cache = createRequestCache();
    let requests = 0;
    server.use(
      http.get('/api/todos', async () => {
        requests += 1;
        await delay(20);
        return HttpResponse.json([{ id: 't1', title: 'One' }]);
      }),
    );
    render(
      <>
        <TodoCount cache={cache} />
        <TodoCount cache={cache} />
        <TodoCount cache={cache} />
      </>,
    );
    expect(screen.getAllByText('loading')).toHaveLength(3);
    await waitFor(() => expect(screen.getAllByText('1 todos')).toHaveLength(3));
    expect(requests).toBe(1);
    expect(cache.fetchCount('/api/todos')).toBe(1);
  });

  it('serves fresh data from the cache without refetching', async () => {
    const cache = createRequestCache();
    const fetcher = vi.fn(() => Promise.resolve(['a']));
    const first = renderHook(() => useRequest('k', fetcher, { cache, staleTimeMs: 60_000 }));
    await waitFor(() => expect(first.result.current.data).toEqual(['a']));
    const second = renderHook(() => useRequest('k', fetcher, { cache, staleTimeMs: 60_000 }));
    expect(second.result.current).toMatchObject({ data: ['a'], isLoading: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('shows stale data immediately and revalidates in the background', async () => {
    const cache = createRequestCache();
    let version = 0;
    const fetcher = vi.fn(() => Promise.resolve(++version));
    const first = renderHook(() => useRequest('n', fetcher, { cache, staleTimeMs: 0 }));
    await waitFor(() => expect(first.result.current.data).toBe(1));
    first.unmount();
    const second = renderHook(() => useRequest('n', fetcher, { cache, staleTimeMs: 0 }));
    expect(second.result.current.data).toBe(1);
    expect(second.result.current.isValidating).toBe(true);
    await waitFor(() => expect(second.result.current.data).toBe(2));
  });

  it('mutate() updates every subscriber and an older response cannot overwrite it', async () => {
    const cache = createRequestCache();
    let release: ((value: string) => void) | undefined;
    let calls = 0;
    const fetcher = () => {
      calls += 1;
      if (calls === 1) return Promise.resolve('server v1');
      if (calls === 2) return new Promise<string>((resolve) => (release = resolve));
      return Promise.resolve('server v2');
    };
    const a = renderHook(() => useRequest('doc', fetcher, { cache }));
    const b = renderHook(() => useRequest('doc', fetcher, { cache }));
    await waitFor(() => expect(a.result.current.data).toBe('server v1'));

    // Start a slow revalidation, then write locally while it is in flight.
    act(() => {
      void a.result.current.revalidate();
    });
    await act(async () => {
      await a.result.current.mutate('local edit', { revalidate: false });
    });
    expect(b.result.current.data).toBe('local edit');
    await act(async () => release?.('stale server value'));
    expect(a.result.current.data).toBe('local edit');

    await act(async () => {
      await b.result.current.mutate((current) => `${current ?? ''}!`);
    });
    expect(a.result.current.data).toBe('server v2');
  });

  it('keeps data and exposes the error when revalidation fails', async () => {
    const cache = createRequestCache();
    const fetcher = vi
      .fn<(key: string) => Promise<string>>()
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useRequest('e', fetcher, { cache }));
    await waitFor(() => expect(result.current.data).toBe('ok'));
    await act(() => result.current.revalidate());
    expect(result.current).toMatchObject({ data: 'ok', isValidating: false });
    expect(result.current.error?.message).toBe('down');
  });

  it('does nothing for a null key', () => {
    const fetcher = vi.fn(() => Promise.resolve(1));
    const { result } = renderHook(() => useRequest(null, fetcher));
    expect(result.current).toMatchObject({ data: undefined, isLoading: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
