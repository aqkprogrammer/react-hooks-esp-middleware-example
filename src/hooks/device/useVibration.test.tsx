import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useVibration } from './useVibration';

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
  vi.useRealTimers();
});

function installVibrate(accepted = true) {
  const vibrate = vi.fn((_pattern: VibratePattern) => accepted);
  restore = overrideProperty(navigator, 'vibrate', vibrate);
  return vibrate;
}

describe('useVibration (unsupported)', () => {
  it('reports unsupported and returns false without throwing', () => {
    expect('vibrate' in navigator).toBe(false);
    const { result } = renderHook(() => useVibration());
    expect(result.current.isSupported).toBe(false);
    let accepted = true;
    act(() => {
      accepted = result.current.vibrate(200);
    });
    expect(accepted).toBe(false);
    expect(result.current.isVibrating).toBe(false);
    act(() => result.current.cancel());
  });
});

describe('useVibration', () => {
  beforeEach(() => vi.useFakeTimers());

  it('vibrates and tracks the pattern duration', () => {
    const vibrate = installVibrate();
    const { result } = renderHook(() => useVibration());
    expect(result.current.isSupported).toBe(true);

    act(() => {
      result.current.vibrate([100, 50, 100]);
    });
    expect(vibrate).toHaveBeenCalledWith([100, 50, 100]);
    expect(result.current.isVibrating).toBe(true);

    act(() => vi.advanceTimersByTime(249));
    expect(result.current.isVibrating).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isVibrating).toBe(false);
  });

  it('reports a rejected call (e.g. no user activation)', () => {
    installVibrate(false);
    const { result } = renderHook(() => useVibration());
    let accepted = true;
    act(() => {
      accepted = result.current.vibrate(300);
    });
    expect(accepted).toBe(false);
    expect(result.current.isVibrating).toBe(false);
  });

  it('cancel() stops the pattern with vibrate(0)', () => {
    const vibrate = installVibrate();
    const { result } = renderHook(() => useVibration());
    act(() => {
      result.current.vibrate(1000);
    });
    act(() => result.current.cancel());
    expect(vibrate).toHaveBeenLastCalledWith(0);
    expect(result.current.isVibrating).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a running pattern and clears its timer on unmount', () => {
    const vibrate = installVibrate();
    const { result, unmount } = renderHook(() => useVibration());
    act(() => {
      result.current.vibrate(500);
    });
    unmount();
    expect(vibrate).toHaveBeenLastCalledWith(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not call vibrate(0) on unmount when idle', () => {
    const vibrate = installVibrate();
    const { unmount } = renderHook(() => useVibration());
    unmount();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
