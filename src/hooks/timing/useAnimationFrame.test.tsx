import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAnimationFrame } from './useAnimationFrame';

/** A manual requestAnimationFrame: `frame(time)` runs the queued callbacks. */
function installManualRaf() {
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  return {
    get pending() {
      return queue.size;
    },
    frame(time: number) {
      const callbacks = [...queue.values()];
      queue.clear();
      act(() => callbacks.forEach((callback) => callback(time)));
    },
  };
}

describe('useAnimationFrame', () => {
  it('passes the delta since the previous frame (0 on the first)', () => {
    const raf = installManualRaf();
    const callback = vi.fn();
    renderHook(() => useAnimationFrame(callback));
    raf.frame(1000);
    raf.frame(1016);
    raf.frame(1050);
    expect(callback.mock.calls).toEqual([
      [0, 1000],
      [16, 1016],
      [34, 1050],
    ]);
  });

  it('pauses without counting the paused time', () => {
    const raf = installManualRaf();
    const callback = vi.fn();
    const { rerender } = renderHook(({ paused }) => useAnimationFrame(callback, { paused }), {
      initialProps: { paused: false },
    });
    raf.frame(100);
    rerender({ paused: true });
    expect(raf.pending).toBe(0);
    rerender({ paused: false });
    raf.frame(5000);
    expect(callback.mock.calls).toEqual([
      [0, 100],
      [0, 5000],
    ]);
  });

  it('uses the latest callback without restarting the loop', () => {
    const raf = installManualRaf();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ fn }) => useAnimationFrame(fn), {
      initialProps: { fn: first },
    });
    raf.frame(10);
    rerender({ fn: second });
    raf.frame(20);
    expect(second).toHaveBeenCalledWith(10, 20);
  });

  it('cancels the pending frame on unmount', () => {
    const raf = installManualRaf();
    const callback = vi.fn();
    const { unmount } = renderHook(() => useAnimationFrame(callback));
    expect(raf.pending).toBe(1);
    unmount();
    expect(raf.pending).toBe(0);
  });

  it('does nothing when requestAnimationFrame is unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const callback = vi.fn();
    expect(() => renderHook(() => useAnimationFrame(callback)).unmount()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });
});
