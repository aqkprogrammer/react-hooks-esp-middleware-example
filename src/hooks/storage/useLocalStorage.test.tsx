import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetStorageAvailability } from './storageState';
import { useLocalStorage } from './useLocalStorage';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

afterEach(() => resetStorageAvailability());

describe('useLocalStorage', () => {
  it('returns the initial value and persists updates as JSON', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    expect(result.current[0]).toBe(0);

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(window.localStorage.getItem('count')).toBe('5');

    act(() => result.current[1]((previous) => previous + 1));
    expect(result.current[0]).toBe(6);
  });

  it('reads an existing stored value', () => {
    window.localStorage.setItem('name', JSON.stringify('Ada'));
    const { result } = renderHook(() => useLocalStorage('name', 'nobody'));
    expect(result.current[0]).toBe('Ada');
  });

  it('keeps components sharing a key in sync within the same tab', () => {
    function Reader() {
      const [value] = useLocalStorage('shared', 'a');
      return <p>reader: {value}</p>;
    }
    const { result } = renderHook(() => useLocalStorage('shared', 'a'));
    render(<Reader />);
    act(() => result.current[1]('b'));
    expect(screen.getByText('reader: b')).toBeInTheDocument();
  });

  it('updates when another tab writes the key (storage event)', () => {
    const { result } = renderHook(() => useLocalStorage('theme', 'light'));
    act(() => {
      window.localStorage.setItem('theme', JSON.stringify('dark'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
    });
    expect(result.current[0]).toBe('dark');
  });

  it('falls back to the initial value and reports corrupt JSON', async () => {
    window.localStorage.setItem('broken', '{not json');
    const onError = vi.fn();
    const { result } = renderHook(() => useLocalStorage('broken', 'fallback', { onError }));
    expect(result.current[0]).toBe('fallback');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'parse', key: 'broken' }));
  });

  it('rejects stored data that fails validation', () => {
    window.localStorage.setItem('tags', JSON.stringify([1, 2]));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useLocalStorage<string[]>('tags', [], { validate: isStringArray, onError }),
    );
    expect(result.current[0]).toEqual([]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'invalid' }));
  });

  it('reports quota errors and keeps the previous value', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useLocalStorage('big', 'small', { onError }));
    act(() => result.current[1]('stored'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    act(() => result.current[1]('huge'));
    expect(result.current[0]).toBe('stored');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'write', key: 'big' }));
  });

  it('removes the key and returns to the initial value', () => {
    const { result } = renderHook(() => useLocalStorage('temp', 'initial'));
    act(() => result.current[1]('changed'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('initial');
    expect(window.localStorage.getItem('temp')).toBeNull();
  });

  it('works in memory when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const onError = vi.fn();
    const { result } = renderHook(() => useLocalStorage('memory', 1, { onError }));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unavailable' }));
  });
});
