import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSet } from './useSet';

describe('useSet', () => {
  it('starts empty or from an iterable / initializer', () => {
    expect(renderHook(() => useSet<string>()).result.current[0].size).toBe(0);
    expect([...renderHook(() => useSet(['a', 'b', 'a'])).result.current[0]]).toEqual(['a', 'b']);
    expect(renderHook(() => useSet(() => [1])).result.current[0].has(1)).toBe(true);
  });

  it('creates a new Set for every change and never mutates the old one', () => {
    const { result } = renderHook(() => useSet(['a']));
    const before = result.current[0];
    act(() => result.current[1].add('b'));
    expect(result.current[0]).not.toBe(before);
    expect([...result.current[0]]).toEqual(['a', 'b']);
    expect([...before]).toEqual(['a']);
  });

  it('removes, toggles (with force) and clears', () => {
    const { result } = renderHook(() => useSet([1, 2]));
    act(() => result.current[1].remove(1));
    expect([...result.current[0]]).toEqual([2]);
    act(() => result.current[1].toggle(3));
    act(() => result.current[1].toggle(2));
    expect([...result.current[0]]).toEqual([3]);
    act(() => result.current[1].toggle(3, true));
    expect(result.current[0].has(3)).toBe(true);
    act(() => result.current[1].clear());
    expect(result.current[0].size).toBe(0);
    act(() => result.current[1].reset());
    expect([...result.current[0]]).toEqual([1, 2]);
  });

  it('keeps the same instance for no-op changes', () => {
    const { result } = renderHook(() => useSet(['x']));
    const before = result.current[0];
    act(() => {
      result.current[1].add('x');
      result.current[1].remove('missing');
      result.current[1].toggle('x', true);
    });
    expect(result.current[0]).toBe(before);
  });

  it('compares objects by reference', () => {
    const item = { id: 1 };
    const { result } = renderHook(() => useSet([item]));
    act(() => result.current[1].add({ id: 1 }));
    expect(result.current[0].size).toBe(2);
  });
});
