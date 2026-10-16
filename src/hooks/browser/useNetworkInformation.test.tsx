import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useNetworkInformation } from './useNetworkInformation';

class FakeConnection extends EventTarget {
  effectiveType = '4g';
  downlink = 10;
  rtt = 50;
  saveData = false;
  listeners = 0;
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>) {
    this.listeners += 1;
    super.addEventListener(...args);
  }
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>) {
    this.listeners -= 1;
    super.removeEventListener(...args);
  }
}

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

describe('useNetworkInformation', () => {
  it('is unsupported without navigator.connection (Firefox, Safari, jsdom)', () => {
    const { result } = renderHook(() => useNetworkInformation());
    expect(result.current).toEqual({ isSupported: false });
  });

  it('reads the connection and updates on change', () => {
    const connection = new FakeConnection();
    restores.push(overrideProperty(navigator, 'connection', connection));
    const { result, rerender, unmount } = renderHook(() => useNetworkInformation());
    expect(result.current).toMatchObject({
      isSupported: true,
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    act(() => {
      connection.effectiveType = '2g';
      connection.saveData = true;
      connection.dispatchEvent(new Event('change'));
    });
    expect(result.current).toMatchObject({ effectiveType: '2g', saveData: true });

    expect(connection.listeners).toBe(1);
    unmount();
    expect(connection.listeners).toBe(0);
  });
});
