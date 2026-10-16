import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetStorageAvailability } from './storageState';
import { useLocalStorage } from './useLocalStorage';
import { useSessionStorage } from './useSessionStorage';

afterEach(() => resetStorageAvailability());

describe('useSessionStorage', () => {
  it('persists to sessionStorage, not localStorage', () => {
    const { result } = renderHook(() => useSessionStorage('wizard:step', 1));
    act(() => result.current[1]((step) => step + 1));
    expect(result.current[0]).toBe(2);
    expect(window.sessionStorage.getItem('wizard:step')).toBe('2');
    expect(window.localStorage.getItem('wizard:step')).toBeNull();
  });

  it('does not collide with a localStorage hook using the same key', () => {
    const session = renderHook(() => useSessionStorage('same', 'session'));
    const local = renderHook(() => useLocalStorage('same', 'local'));
    act(() => session.result.current[1]('changed'));
    expect(local.result.current[0]).toBe('local');
  });

  it('reports quota errors and keeps the previous value', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSessionStorage('draft', '', { onError }));
    act(() => result.current[1]('saved'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    act(() => result.current[1]('too big'));
    expect(result.current[0]).toBe('saved');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'write' }));
  });

  it('removes the key', () => {
    const { result } = renderHook(() => useSessionStorage('temp', 'x'));
    act(() => result.current[1]('y'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('x');
    expect(window.sessionStorage.getItem('temp')).toBeNull();
  });
});
