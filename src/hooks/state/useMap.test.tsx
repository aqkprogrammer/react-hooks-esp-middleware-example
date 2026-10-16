import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMap } from './useMap';

describe('useMap', () => {
  it('sets keys immutably, preserving the old instance', () => {
    const { result } = renderHook(() => useMap<string, number>([['a', 1]]));
    const before = result.current[0];
    act(() => result.current[1].set('b', 2));
    expect(result.current[0]).not.toBe(before);
    expect([...result.current[0]]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect([...before]).toEqual([['a', 1]]);
  });

  it('updates from the current value and keeps insertion order', () => {
    const { result } = renderHook(() =>
      useMap<string, number>([
        ['a', 1],
        ['b', 1],
      ]),
    );
    act(() => {
      result.current[1].update('a', (count = 0) => count + 1);
      result.current[1].update('a', (count = 0) => count + 1);
      result.current[1].update('c', (count = 0) => count + 1);
    });
    expect([...result.current[0]]).toEqual([
      ['a', 3],
      ['b', 1],
      ['c', 1],
    ]);
  });

  it('removes, clears and resets', () => {
    const { result } = renderHook(() => useMap(() => [['k', 'v'] as const]));
    act(() => result.current[1].remove('k'));
    expect(result.current[0].size).toBe(0);
    act(() => result.current[1].set('k', 'v'));
    act(() => result.current[1].clear());
    expect(result.current[0].size).toBe(0);
    act(() => result.current[1].reset());
    expect(result.current[0].get('k')).toBe('v');
  });

  it('keeps the same instance for no-op changes', () => {
    const { result } = renderHook(() => useMap([['a', 1]]));
    const before = result.current[0];
    act(() => {
      result.current[1].set('a', 1);
      result.current[1].remove('missing');
    });
    expect(result.current[0]).toBe(before);
  });

  it('stores an explicit undefined value for a new key', () => {
    const { result } = renderHook(() => useMap<string, number | undefined>());
    act(() => result.current[1].set('x', undefined));
    expect(result.current[0].has('x')).toBe(true);
  });
});
