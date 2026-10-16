import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSSE } from './useSSE';

/**
 * Minimal EventSource fake: MSW's `sse()` handler needs a native EventSource,
 * which jsdom and Node lack, so the stream is driven by hand.
 */
class FakeEventSource extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instances: FakeEventSource[] = [];
  readyState = FakeEventSource.CONNECTING;
  closed = false;

  constructor(
    readonly url: string,
    readonly init?: EventSourceInit,
  ) {
    super();
    FakeEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }
  open() {
    this.readyState = FakeEventSource.OPEN;
    act(() => void this.dispatchEvent(new Event('open')));
  }
  emit(data: string, type = 'message', lastEventId = '') {
    act(() => void this.dispatchEvent(new MessageEvent(type, { data, lastEventId })));
  }
  fail(fatal: boolean) {
    this.readyState = fatal ? FakeEventSource.CLOSED : FakeEventSource.CONNECTING;
    act(() => void this.dispatchEvent(new Event('error')));
  }
}

function install() {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
  return FakeEventSource;
}

describe('useSSE', () => {
  it('connects, opens and parses JSON messages', () => {
    const ES = install();
    const onMessage = vi.fn();
    const { result } = renderHook(() => useSSE<{ count: number }>('/api/events', { onMessage }));
    expect(result.current.status).toBe('connecting');
    const source = ES.instances[0]!;
    expect(source.url).toBe('/api/events');
    source.open();
    expect(result.current.status).toBe('open');
    source.emit('{"count":1}', 'message', '1');
    expect(result.current.lastMessage).toEqual({
      type: 'message',
      data: { count: 1 },
      lastEventId: '1',
    });
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('listens to named events and limits history', () => {
    const ES = install();
    const { result } = renderHook(() =>
      useSSE<string>('/feed', { eventTypes: ['price'], historyLimit: 2 }),
    );
    const source = ES.instances[0]!;
    source.emit('ignored');
    source.emit('a', 'price');
    source.emit('b', 'price');
    source.emit('c', 'price');
    expect(result.current.messages.map((message) => message.data)).toEqual(['b', 'c']);
  });

  it('reflects browser retries and fatal errors', () => {
    const ES = install();
    const { result } = renderHook(() => useSSE('/api/events'));
    const source = ES.instances[0]!;
    source.open();
    source.fail(false);
    expect(result.current.status).toBe('connecting');
    source.fail(true);
    expect(result.current.status).toBe('closed');
    act(() => result.current.reconnect());
    expect(ES.instances).toHaveLength(2);
    expect(source.closed).toBe(true);
    expect(result.current.status).toBe('connecting');
  });

  it('close() stops the stream; unmount closes and detaches', () => {
    const ES = install();
    const { result, unmount } = renderHook(() => useSSE('/api/events'));
    act(() => result.current.close());
    expect(ES.instances[0]?.closed).toBe(true);
    expect(result.current.status).toBe('closed');

    const second = renderHook(() => useSSE('/other'));
    const source = ES.instances[1]!;
    second.unmount();
    unmount();
    expect(source.closed).toBe(true);
    const before = second.result.current;
    source.emit('late');
    expect(second.result.current).toBe(before);
  });

  it('opens a new stream when the URL changes', () => {
    const ES = install();
    const { rerender } = renderHook(({ url }) => useSSE(url), { initialProps: { url: '/a' } });
    rerender({ url: '/b' });
    expect(ES.instances.map((source) => [source.url, source.closed])).toEqual([
      ['/a', true],
      ['/b', false],
    ]);
  });

  it('is unsupported without EventSource', () => {
    vi.stubGlobal('EventSource', undefined);
    const { result } = renderHook(() => useSSE('/api/events'));
    expect(result.current).toMatchObject({ isSupported: false, status: 'closed' });
  });
});
