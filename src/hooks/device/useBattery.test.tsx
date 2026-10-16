import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useBattery, type BatteryManagerLike } from './useBattery';

class FakeBattery extends EventTarget implements BatteryManagerLike {
  charging = true;
  chargingTime = 1200;
  dischargingTime = Infinity;
  level = 0.5;
}

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

function installBattery(result: Promise<BatteryManagerLike>) {
  const getBattery = vi.fn(() => result);
  restore = overrideProperty(navigator, 'getBattery', getBattery);
  return getBattery;
}

describe('useBattery', () => {
  it('reports unsupported browsers (Firefox, Safari)', () => {
    const { result } = renderHook(() => useBattery());
    expect(result.current).toEqual({
      isSupported: false,
      loading: false,
      battery: null,
      error: null,
    });
  });

  it('loads the battery state and follows change events', async () => {
    const battery = new FakeBattery();
    installBattery(Promise.resolve(battery));
    const { result } = renderHook(() => useBattery());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.battery).not.toBeNull());
    expect(result.current.loading).toBe(false);
    expect(result.current.battery).toEqual({
      charging: true,
      chargingTime: 1200,
      dischargingTime: Infinity,
      level: 0.5,
    });

    act(() => {
      battery.level = 0.42;
      battery.charging = false;
      battery.dispatchEvent(new Event('levelchange'));
    });
    expect(result.current.battery).toMatchObject({ level: 0.42, charging: false });
  });

  it('removes every listener on unmount', async () => {
    const battery = new FakeBattery();
    const add = vi.spyOn(battery, 'addEventListener');
    const remove = vi.spyOn(battery, 'removeEventListener');
    installBattery(Promise.resolve(battery));
    const { result, unmount } = renderHook(() => useBattery());
    await waitFor(() => expect(result.current.battery).not.toBeNull());

    unmount();
    expect(add).toHaveBeenCalledTimes(4);
    expect(remove.mock.calls.map(([type]) => type).sort()).toEqual(
      add.mock.calls.map(([type]) => type).sort(),
    );
  });

  it('does not subscribe when unmounted before getBattery() resolves', async () => {
    const battery = new FakeBattery();
    const add = vi.spyOn(battery, 'addEventListener');
    let resolve!: (value: BatteryManagerLike) => void;
    installBattery(new Promise((settle) => (resolve = settle)));
    const { unmount } = renderHook(() => useBattery());
    unmount();
    await act(async () => resolve(battery));
    expect(add).not.toHaveBeenCalled();
  });

  it('exposes rejections such as a Permissions-Policy SecurityError', async () => {
    installBattery(Promise.reject(new DOMException('Blocked by policy', 'SecurityError')));
    const { result } = renderHook(() => useBattery());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('Blocked by policy');
    expect(result.current.loading).toBe(false);
  });
});
