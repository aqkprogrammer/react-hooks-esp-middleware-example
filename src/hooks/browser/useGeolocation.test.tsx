import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useGeolocation } from './useGeolocation';

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

const restores: Array<() => void> = [];

function fakePosition(latitude: number): GeolocationPosition {
  return {
    coords: { latitude, longitude: 4.9, accuracy: 20 },
    timestamp: 1,
  } as unknown as GeolocationPosition;
}

function fakeError(code: number, message: string): GeolocationPositionError {
  return { code, message } as GeolocationPositionError;
}

function installGeolocation() {
  const current: Array<{ success: Success; failure: Failure; options?: PositionOptions }> = [];
  const watches = new Map<number, { success: Success; failure: Failure }>();
  let nextId = 1;
  const geolocation = {
    getCurrentPosition: vi.fn((success: Success, failure: Failure, options?: PositionOptions) => {
      current.push({ success, failure, options });
    }),
    watchPosition: vi.fn((success: Success, failure: Failure) => {
      const id = nextId++;
      watches.set(id, { success, failure });
      return id;
    }),
    clearWatch: vi.fn((id: number) => watches.delete(id)),
  };
  restores.push(overrideProperty(navigator, 'geolocation', geolocation));
  return { geolocation, current, watches };
}

afterEach(() => {
  while (restores.length) restores.pop()?.();
});

describe('useGeolocation', () => {
  it('does not request anything on mount', () => {
    const { geolocation } = installGeolocation();
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.isSupported).toBe(true);
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it('gets the current position with the given options', () => {
    const { current } = installGeolocation();
    const { result } = renderHook(() =>
      useGeolocation({ enableHighAccuracy: true, timeout: 5000 }),
    );
    act(() => result.current.getCurrentPosition());
    expect(result.current.loading).toBe(true);
    expect(current[0]?.options).toEqual({ enableHighAccuracy: true, timeout: 5000 });

    act(() => current[0]?.success(fakePosition(52.3)));
    expect(result.current.status).toBe('success');
    expect(result.current.position?.coords.latitude).toBe(52.3);
  });

  it('normalises permission-denied errors', () => {
    const { current } = installGeolocation();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.getCurrentPosition());
    act(() => current[0]?.failure(fakeError(1, 'User denied Geolocation')));
    expect(result.current.status).toBe('error');
    expect(result.current.isPermissionDenied).toBe(true);
    expect(result.current.error).toEqual({
      kind: 'permission-denied',
      code: 1,
      message: 'User denied Geolocation',
    });
  });

  it('watches until clearWatch() and clears the watch on unmount', () => {
    const { geolocation, watches } = installGeolocation();
    const { result, unmount } = renderHook(() => useGeolocation());
    act(() => result.current.watchPosition());
    expect(result.current.isWatching).toBe(true);
    const [id, watch] = [...watches.entries()][0] ?? [];
    act(() => watch?.success(fakePosition(1)));
    act(() => watch?.success(fakePosition(2)));
    expect(result.current.position?.coords.latitude).toBe(2);

    act(() => result.current.clearWatch());
    expect(geolocation.clearWatch).toHaveBeenCalledWith(id);
    expect(result.current.isWatching).toBe(false);

    act(() => result.current.watchPosition());
    unmount();
    expect(geolocation.clearWatch).toHaveBeenCalledTimes(2);
    expect(watches.size).toBe(0);
  });

  it('stops watching when permission is denied', () => {
    const { watches } = installGeolocation();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.watchPosition());
    const watch = [...watches.values()][0];
    act(() => watch?.failure(fakeError(1, 'denied')));
    expect(result.current.isWatching).toBe(false);
    expect(watches.size).toBe(0);
  });

  it('ignores results from an older request', () => {
    const { current } = installGeolocation();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.getCurrentPosition());
    act(() => result.current.getCurrentPosition());
    act(() => current[1]?.success(fakePosition(2)));
    act(() => current[0]?.success(fakePosition(1)));
    expect(result.current.position?.coords.latitude).toBe(2);
  });

  it('reports an unsupported browser without throwing', () => {
    // jsdom has no navigator.geolocation.
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isSupported).toBe(false);
    act(() => result.current.getCurrentPosition());
    expect(result.current.error?.kind).toBe('unsupported');
  });
});
