import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdle } from './useIdle';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useIdle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('becomes idle after the timeout without activity', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() => useIdle(1000, { onIdle }));
    expect(result.current.isIdle).toBe(false);
    advance(999);
    expect(result.current.isIdle).toBe(false);
    advance(1);
    expect(result.current.isIdle).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('activity postpones idleness and wakes an idle user', () => {
    const onActive = vi.fn();
    const { result } = renderHook(() => useIdle(1000, { onActive }));
    advance(800);
    fireEvent.keyDown(window, { key: 'a' });
    advance(800);
    expect(result.current.isIdle).toBe(false);
    advance(200);
    expect(result.current.isIdle).toBe(true);
    act(() => {
      fireEvent.pointerMove(window);
    });
    expect(result.current.isIdle).toBe(false);
    expect(onActive).toHaveBeenCalledTimes(1);
  });

  it('records the last activity time', () => {
    const { result } = renderHook(() => useIdle(1000));
    advance(300);
    fireEvent.pointerDown(window);
    expect(result.current.getLastActive()).toBe(Date.now());
  });

  it('only listens to the configured events', () => {
    const { result } = renderHook(() => useIdle(1000, { events: ['keydown'] }));
    advance(900);
    fireEvent.pointerMove(window);
    advance(100);
    expect(result.current.isIdle).toBe(true);
  });

  it('treats returning to the tab as activity', () => {
    const { result } = renderHook(() => useIdle(1000));
    advance(1000);
    expect(result.current.isIdle).toBe(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.isIdle).toBe(false);
  });

  it('starts idle with initialState until activity', () => {
    const { result } = renderHook(() => useIdle(1000, { initialState: true }));
    expect(result.current.isIdle).toBe(true);
    act(() => {
      fireEvent.keyDown(window);
    });
    expect(result.current.isIdle).toBe(false);
  });

  it('removes listeners and timers on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useIdle(1000));
    unmount();
    expect(remove.mock.calls.length).toBe(add.mock.calls.length);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not re-subscribe for a new but equal events array', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { rerender } = renderHook(() => useIdle(1000, { events: ['keydown', 'wheel'] }));
    const count = add.mock.calls.length;
    rerender();
    expect(add.mock.calls.length).toBe(count);
  });
});
