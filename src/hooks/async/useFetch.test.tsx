import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { HttpError, TimeoutError } from './errors';
import { fetchJson } from './fetchJson';
import { useFetch } from './useFetch';

interface User {
  id: number;
  name: string;
}

describe('useFetch', () => {
  it('fetches typed JSON', async () => {
    const { result } = renderHook(() => useFetch<User>('/api/users/1'));
    expect(result.current.status).toBe('pending');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data?.name).toBe('Ada Lovelace');
  });

  it('turns non-2xx responses into an HttpError with status and body', async () => {
    const { result } = renderHook(() => useFetch<User>('/api/users/999'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    const error = result.current.error;
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
    expect((error as HttpError).body).toEqual({ message: 'User not found' });
  });

  it('reports network failures', async () => {
    server.use(http.get('/api/users/:id', () => HttpResponse.error()));
    const { result } = renderHook(() => useFetch<User>('/api/users/1'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(TypeError);
  });

  it('never shows a stale response when the URL changes quickly', async () => {
    server.use(
      http.get('/api/users/:id', async ({ params }) => {
        // User 1 is slow, user 2 is fast: the first response arrives last.
        await delay(params.id === '1' ? 150 : 10);
        return HttpResponse.json({ id: Number(params.id), name: `User ${String(params.id)}` });
      }),
    );
    const seen: Array<string | undefined> = [];
    const { result, rerender } = renderHook(
      ({ id }) => {
        const state = useFetch<User>(`/api/users/${id}`);
        seen.push(state.data?.name);
        return state;
      },
      { initialProps: { id: 1 } },
    );
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data?.name).toBe('User 2'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    expect(result.current.data?.name).toBe('User 2');
    expect(seen).not.toContain('User 1');
  });

  it('aborts the request on unmount', async () => {
    let requestSignal: AbortSignal | undefined;
    server.use(
      http.get('/api/slow', async ({ request }) => {
        requestSignal = request.signal;
        await delay(500);
        return HttpResponse.json({});
      }),
    );
    const { unmount } = renderHook(() => useFetch('/api/slow'));
    await waitFor(() => expect(requestSignal).toBeDefined());
    unmount();
    await waitFor(() => expect(requestSignal?.aborted).toBe(true));
  });

  it('times out with a TimeoutError', async () => {
    const { result } = renderHook(() => useFetch('/api/slow?ms=300', { timeoutMs: 20 }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(TimeoutError);
  });

  it('is idle for a null URL', () => {
    const { result } = renderHook(() => useFetch(null));
    expect(result.current.status).toBe('idle');
  });

  it('does not refetch for a new but equal init object, but does for a new body', async () => {
    let calls = 0;
    server.use(
      http.post('/api/echo', async ({ request }) => {
        calls += 1;
        return HttpResponse.json(await request.json());
      }),
    );
    const { result, rerender } = renderHook(
      ({ body }) =>
        useFetch<{ q: string }>('/api/echo', {
          init: { method: 'POST', body, headers: { 'content-type': 'application/json' } },
        }),
      { initialProps: { body: '{"q":"a"}' } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ q: 'a' }));
    rerender({ body: '{"q":"a"}' });
    expect(calls).toBe(1);
    rerender({ body: '{"q":"b"}' });
    await waitFor(() => expect(result.current.data).toEqual({ q: 'b' }));
    expect(calls).toBe(2);
  });

  it('uses a custom parser', async () => {
    const { result } = renderHook(() =>
      useFetch('/api/users/2', {
        parse: async (response) => ((await response.json()) as User).name.toUpperCase(),
      }),
    );
    await waitFor(() => expect(result.current.data).toBe('GRACE HOPPER'));
  });
});

describe('fetchJson', () => {
  it('rejects with AbortError when the caller aborts', async () => {
    const controller = new AbortController();
    const promise = fetchJson('/api/slow?ms=300', { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns undefined for an empty body', async () => {
    server.use(http.get('/api/empty', () => new HttpResponse(null, { status: 204 })));
    await expect(fetchJson('/api/empty')).resolves.toBeUndefined();
  });
});
