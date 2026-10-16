import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { usePermission } from './usePermission';

class FakeStatus extends EventTarget {
  constructor(
    public state: PermissionState,
    public name: string,
  ) {
    super();
  }
  set(state: PermissionState) {
    this.state = state;
    act(() => {
      this.dispatchEvent(new Event('change'));
    });
  }
}

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

function installPermissions(states: Record<string, PermissionState>) {
  const statuses = new Map<string, FakeStatus>();
  const query = vi.fn(async ({ name }: { name: string }) => {
    const state = states[name];
    if (!state)
      throw new TypeError(`'${name}' is not a valid value for enumeration PermissionName.`);
    const status = statuses.get(name) ?? new FakeStatus(state, name);
    statuses.set(name, status);
    return status;
  });
  restore = overrideProperty(navigator, 'permissions', { query });
  return { query, status: (name: string) => statuses.get(name) };
}

describe('usePermission', () => {
  it('reports unsupported without the Permissions API', () => {
    const { result } = renderHook(() => usePermission('geolocation'));
    expect(result.current).toEqual({
      isSupported: false,
      status: 'unsupported',
      state: null,
      error: null,
    });
  });

  it('queries (without prompting) and follows change events', async () => {
    const permissions = installPermissions({ geolocation: 'prompt' });
    const { result } = renderHook(() => usePermission('geolocation'));
    expect(result.current.status).toBe('pending');
    await waitFor(() => expect(result.current.state).toBe('prompt'));
    expect(permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });

    permissions.status('geolocation')?.set('granted');
    expect(result.current).toMatchObject({ status: 'granted', state: 'granted' });
  });

  it('reports names the browser does not support as an error', async () => {
    installPermissions({});
    const { result } = renderHook(() => usePermission('clipboard-read'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(TypeError);
  });

  it('removes the change listener on unmount and when the name changes', async () => {
    const permissions = installPermissions({ camera: 'denied', microphone: 'granted' });
    const { result, rerender, unmount } = renderHook(({ name }) => usePermission(name), {
      initialProps: { name: 'camera' },
    });
    await waitFor(() => expect(result.current.state).toBe('denied'));
    const camera = permissions.status('camera');
    const removeCamera = vi.spyOn(camera!, 'removeEventListener');

    rerender({ name: 'microphone' });
    expect(result.current.status).toBe('pending');
    expect(removeCamera).toHaveBeenCalledWith('change', expect.any(Function));
    await waitFor(() => expect(result.current.state).toBe('granted'));

    const microphone = permissions.status('microphone');
    const removeMic = vi.spyOn(microphone!, 'removeEventListener');
    unmount();
    expect(removeMic).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
