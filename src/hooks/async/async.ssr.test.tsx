// Runs in the "ssr" Vitest project (Node, no DOM): async hooks must render on
// the server without starting requests or touching browser globals.
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useAsync } from './useAsync';
import { useFetch } from './useFetch';
import { useInfiniteScroll } from './useInfiniteScroll';
import { usePagination } from './usePagination';
import { usePolling } from './usePolling';
import { useRequest } from './useRequest';
import { useSSE } from './useSSE';
import { useWebSocket } from './useWebSocket';

const neverCalled = vi.fn(() => Promise.resolve('x'));

function Dashboard() {
  const asyncState = useAsync(neverCalled, []);
  const disabled = useFetch(null);
  const polling = usePolling(neverCalled, { intervalMs: 1000 });
  const request = useRequest('/api/users', neverCalled);
  const pager = usePagination({ total: 42 });
  const scroll = useInfiniteScroll({ loadMore: neverCalled, hasMore: true });
  const socket = useWebSocket('wss://example.invalid');
  const sse = useSSE('/api/events');
  return (
    <p>
      {[
        asyncState.status,
        disabled.status,
        String(polling.isPaused),
        String(request.isLoading),
        pager.totalPages,
        String(scroll.isSupported),
        socket.status,
        sse.status,
      ].join('|')}
    </p>
  );
}

describe('async hooks on the server', () => {
  it('render without running effects or touching browser APIs', () => {
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Dashboard />)).toBe(
      '<p>pending|idle|false|true|5|false|closed|closed</p>',
    );
    expect(neverCalled).not.toHaveBeenCalled();
  });
});
