import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useWindowSize } from './useWindowSize';

const restores: Array<() => void> = [];

function resizeTo(width: number, height: number) {
  restores.push(overrideProperty(window, 'innerWidth', width));
  restores.push(overrideProperty(window, 'innerHeight', height));
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

afterEach(() => {
  while (restores.length) restores.pop()?.();
  vi.useRealTimers();
});

describe('useWindowSize', () => {
  it('returns the current size and updates on resize', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toEqual({ width: window.innerWidth, height: window.innerHeight });
    resizeTo(500, 400);
    expect(result.current).toEqual({ width: 500, height: 400 });
  });

  it('returns the same object while the size is unchanged', () => {
    const { result, rerender } = renderHook(() => useWindowSize());
    const first = result.current;
    rerender();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(first);
  });

  it('throttles re-renders but delivers the trailing size', () => {
    vi.useFakeTimers();
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useWindowSize({ throttleMs: 100 });
    });
    const initialRenders = renders;
    resizeTo(300, 300); // leading edge → immediate
    expect(result.current.width).toBe(300);
    resizeTo(310, 300);
    resizeTo(320, 300);
    expect(renders).toBe(initialRenders + 1);
    act(() => vi.advanceTimersByTime(100)); // trailing edge
    expect(result.current.width).toBe(320);
    expect(renders).toBe(initialRenders + 2);
  });

  it('removes the listener and pending timer on unmount', () => {
    vi.useFakeTimers();
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useWindowSize({ throttleMs: 100 }));
    resizeTo(200, 200);
    resizeTo(210, 200);
    unmount();
    expect(remove.mock.calls.some(([type]) => type === 'resize')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
