import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBroadcastChannel } from './useBroadcastChannel';

type Msg = { type: 'hello'; from: string } | { type: 'logout' };

const isMsg = (data: unknown): data is Msg =>
  typeof data === 'object' &&
  data !== null &&
  ((data as Msg).type === 'hello' || (data as Msg).type === 'logout');

// Node provides a real, in-process BroadcastChannel; two hooks stand in for two tabs.
describe('useBroadcastChannel', () => {
  it('delivers typed messages to other instances, not the sender', async () => {
    const onA = vi.fn();
    const onB = vi.fn();
    const a = renderHook(() => useBroadcastChannel<Msg>('test:hello', { onMessage: onA }));
    const b = renderHook(() => useBroadcastChannel<Msg>('test:hello', { onMessage: onB }));
    expect(a.result.current.isSupported).toBe(true);

    act(() => {
      expect(a.result.current.postMessage({ type: 'hello', from: 'a' })).toBe(true);
    });
    await waitFor(() => expect(b.result.current.lastMessage).toEqual({ type: 'hello', from: 'a' }));
    expect(onB).toHaveBeenCalledTimes(1);
    expect(onA).not.toHaveBeenCalled();
    a.unmount();
    b.unmount();
  });

  it('always calls the latest onMessage handler', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const sender = renderHook(() => useBroadcastChannel<Msg>('test:latest'));
    const receiver = renderHook(
      ({ handler }) => useBroadcastChannel<Msg>('test:latest', { onMessage: handler }),
      {
        initialProps: { handler: first },
      },
    );
    receiver.rerender({ handler: second });
    act(() => void sender.result.current.postMessage({ type: 'logout' }));
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(first).not.toHaveBeenCalled();
    sender.unmount();
    receiver.unmount();
  });

  it('drops invalid messages and reports them', async () => {
    const onError = vi.fn();
    const onMessage = vi.fn();
    const raw = new BroadcastChannel('test:invalid');
    const { result, unmount } = renderHook(() =>
      useBroadcastChannel<Msg>('test:invalid', { validate: isMsg, onMessage, onError }),
    );
    raw.postMessage({ type: 'unknown' });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onMessage).not.toHaveBeenCalled();
    expect(result.current.lastMessage).toBeUndefined();
    raw.close();
    unmount();
  });

  it('reports unclonable messages instead of throwing', () => {
    const onError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useBroadcastChannel<unknown>('test:clone', { onError }),
    );
    let ok = true;
    act(() => {
      ok = result.current.postMessage({ fn: () => 1 });
    });
    expect(ok).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('closes the channel on unmount', () => {
    const close = vi.spyOn(BroadcastChannel.prototype, 'close');
    const { result, unmount } = renderHook(() => useBroadcastChannel('test:close'));
    unmount();
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.postMessage('after unmount')).toBe(false);
  });

  it('is unsupported (and postMessage returns false) without BroadcastChannel', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const { result } = renderHook(() => useBroadcastChannel('test:none'));
    expect(result.current.isSupported).toBe(false);
    expect(result.current.postMessage('x')).toBe(false);
  });
});
