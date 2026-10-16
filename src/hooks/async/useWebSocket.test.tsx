import { act, renderHook, waitFor } from '@testing-library/react';
import { ws } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { LIVE_SOCKET_URL } from '../../mocks/handlers';
import { server } from '../../test/server';
import { useWebSocket } from './useWebSocket';

interface ServerMessage {
  type: string;
  text?: string;
}

const live = ws.link(LIVE_SOCKET_URL);

describe('useWebSocket (MSW WebSocket mock)', () => {
  it('connects, receives messages and sends JSON', async () => {
    const { result } = renderHook(() => useWebSocket<ServerMessage>(LIVE_SOCKET_URL));
    expect(result.current.status).toBe('connecting');
    await waitFor(() => expect(result.current.status).toBe('open'));
    await waitFor(() => expect(result.current.lastMessage?.type).toBe('welcome'));

    act(() => {
      expect(result.current.sendJson({ type: 'notify', text: 'hi' })).toBe(true);
    });
    await waitFor(() => expect(result.current.lastMessage).toMatchObject({ text: 'hi' }));
    expect(result.current.messages.map((message) => message.type)).toEqual([
      'welcome',
      'notification',
    ]);
  });

  it('returns false from send while not open', () => {
    const { result } = renderHook(() => useWebSocket(LIVE_SOCKET_URL));
    expect(result.current.send('too early')).toBe(false);
  });

  it('keeps at most historyLimit messages', async () => {
    const { result } = renderHook(() =>
      useWebSocket<ServerMessage>(LIVE_SOCKET_URL, { historyLimit: 2 }),
    );
    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => {
      result.current.sendJson({ type: 'ping' });
      result.current.sendJson({ type: 'ping' });
    });
    await waitFor(() =>
      expect(result.current.messages.map((m) => m.type)).toEqual(['pong', 'pong']),
    );
  });

  it('reconnects with backoff after an unexpected close', async () => {
    let connections = 0;
    server.use(
      live.addEventListener('connection', ({ client }) => {
        connections += 1;
        if (connections === 1) setTimeout(() => client.close(4000, 'server restart'), 5);
      }),
    );
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket(LIVE_SOCKET_URL, {
        reconnect: { baseDelayMs: 5, jitter: 'none' },
        onClose,
      }),
    );
    await waitFor(() => expect(connections).toBe(2));
    await waitFor(() => expect(result.current.status).toBe('open'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.reconnectAttempt).toBe(0);
  });

  it('gives up after maxAttempts', async () => {
    server.use(
      live.addEventListener('connection', ({ client }) => {
        setTimeout(() => client.close(4000, 'always failing'), 5);
      }),
    );
    const { result } = renderHook(() =>
      useWebSocket(LIVE_SOCKET_URL, { reconnect: { maxAttempts: 2, baseDelayMs: 1 } }),
    );
    await waitFor(() => expect(result.current.gaveUp).toBe(true));
    expect(result.current.status).toBe('closed');
  });

  it('close() does not reconnect; reconnect() does', async () => {
    let connections = 0;
    server.use(live.addEventListener('connection', () => void (connections += 1)));
    const { result } = renderHook(() =>
      useWebSocket(LIVE_SOCKET_URL, { reconnect: { baseDelayMs: 1 } }),
    );
    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => result.current.close());
    await waitFor(() => expect(result.current.status).toBe('closed'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(connections).toBe(1);
    expect(result.current.gaveUp).toBe(false);

    act(() => result.current.reconnect());
    expect(result.current.status).toBe('connecting');
    await waitFor(() => expect(result.current.status).toBe('open'));
    expect(connections).toBe(2);
  });

  it('closes the socket on unmount without reconnecting', async () => {
    const serverSawClose = vi.fn();
    let connections = 0;
    server.use(
      live.addEventListener('connection', ({ client }) => {
        connections += 1;
        client.addEventListener('close', serverSawClose);
      }),
    );
    const { result, unmount } = renderHook(() =>
      useWebSocket(LIVE_SOCKET_URL, { reconnect: { baseDelayMs: 1 } }),
    );
    await waitFor(() => expect(result.current.status).toBe('open'));
    unmount();
    await waitFor(() => expect(serverSawClose).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(connections).toBe(1);
  });

  it('is closed and unsupported without WebSocket, or with a null URL', () => {
    const { result } = renderHook(() => useWebSocket(null));
    expect(result.current.status).toBe('closed');
    vi.stubGlobal('WebSocket', undefined);
    const unsupported = renderHook(() => useWebSocket(LIVE_SOCKET_URL));
    expect(unsupported.result.current).toMatchObject({ isSupported: false, status: 'closed' });
  });
});
