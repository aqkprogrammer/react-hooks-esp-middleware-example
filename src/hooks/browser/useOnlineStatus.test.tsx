import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setOnline } from '../../test/browserMocks';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  it('follows navigator.onLine through online/offline events', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    const restoreOffline = setOnline(false);
    expect(result.current).toBe(false);
    restoreOffline();
    const restoreOnline = setOnline(true);
    expect(result.current).toBe(true);
    restoreOnline();
  });

  it('removes both listeners on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    const types = remove.mock.calls.map(([type]) => type);
    expect(types).toEqual(expect.arrayContaining(['online', 'offline']));
  });
});
