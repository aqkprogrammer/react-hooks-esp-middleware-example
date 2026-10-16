import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useDevicePixelRatio } from './useDevicePixelRatio';

/** matchMedia fake that tracks listeners per query, so tests can assert re-subscription. */
function installResolutionMedia() {
  const listeners = new Map<string, Set<() => void>>();
  const matchMedia = vi.fn((query: string) => {
    const set = listeners.get(query) ?? new Set<() => void>();
    listeners.set(query, set);
    return {
      media: query,
      matches: true,
      addEventListener: (_type: string, listener: () => void) => set.add(listener),
      removeEventListener: (_type: string, listener: () => void) => set.delete(listener),
    } as unknown as MediaQueryList;
  });
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    count: (query: string) => listeners.get(query)?.size ?? 0,
    fire: (query: string) =>
      act(() => {
        [...(listeners.get(query) ?? [])].forEach((listener) => listener());
      }),
  };
}

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

const setRatio = (ratio: number) => {
  restore?.();
  restore = overrideProperty(window, 'devicePixelRatio', ratio);
};

describe('useDevicePixelRatio', () => {
  it('returns the current ratio', () => {
    setRatio(1.5);
    const { result } = renderHook(() => useDevicePixelRatio());
    expect(result.current).toBe(1.5);
  });

  it('re-subscribes to a query for the new ratio after a change (zoom / monitor move)', () => {
    setRatio(1);
    const media = installResolutionMedia();
    const { result, unmount } = renderHook(() => useDevicePixelRatio());
    expect(media.count('(resolution: 1dppx)')).toBe(1);

    setRatio(2);
    media.fire('(resolution: 1dppx)');
    expect(result.current).toBe(2);
    expect(media.count('(resolution: 1dppx)')).toBe(0);
    expect(media.count('(resolution: 2dppx)')).toBe(1);

    setRatio(1.25);
    media.fire('(resolution: 2dppx)');
    expect(result.current).toBe(1.25);

    unmount();
    expect(media.count('(resolution: 1.25dppx)')).toBe(0);
  });

  it('falls back to resize events without matchMedia', () => {
    setRatio(1);
    const remove = vi.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => useDevicePixelRatio());
    setRatio(3);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(3);
    unmount();
    expect(remove.mock.calls.some(([type]) => type === 'resize')).toBe(true);
  });

  it('uses defaultValue when the browser reports no ratio', () => {
    setRatio(0);
    const { result } = renderHook(() => useDevicePixelRatio({ defaultValue: 2 }));
    expect(result.current).toBe(2);
  });
});
