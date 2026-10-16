import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useList } from './useList';

const setup = <T,>(initial: T[]) => renderHook(() => useList(initial));

describe('useList', () => {
  it('pushes immutably and leaves the previous array untouched', () => {
    const { result } = setup([1]);
    const before = result.current[0];
    act(() => result.current[1].push(2, 3));
    expect(result.current[0]).toEqual([1, 2, 3]);
    expect(result.current[0]).not.toBe(before);
    expect(before).toEqual([1]);
  });

  it('inserts at a clamped index', () => {
    const { result } = setup(['a', 'c']);
    act(() => result.current[1].insertAt(1, 'b'));
    expect(result.current[0]).toEqual(['a', 'b', 'c']);
    act(() => result.current[1].insertAt(99, 'z'));
    act(() => result.current[1].insertAt(-5, '0'));
    expect(result.current[0]).toEqual(['0', 'a', 'b', 'c', 'z']);
  });

  it('updates, removes and moves items', () => {
    const { result } = setup(['a', 'b', 'c', 'd']);
    act(() => result.current[1].updateAt(1, (item) => item.toUpperCase()));
    expect(result.current[0]).toEqual(['a', 'B', 'c', 'd']);
    act(() => result.current[1].removeAt(0));
    expect(result.current[0]).toEqual(['B', 'c', 'd']);
    act(() => result.current[1].move(0, 2));
    expect(result.current[0]).toEqual(['c', 'd', 'B']);
    act(() => result.current[1].move(2, 0));
    expect(result.current[0]).toEqual(['B', 'c', 'd']);
  });

  it('returns the same array for no-op operations', () => {
    const { result } = setup([1, 2, 3]);
    const before = result.current[0];
    act(() => {
      result.current[1].removeAt(10);
      result.current[1].removeAt(-1);
      result.current[1].updateAt(5, () => 0);
      result.current[1].updateAt(0, (item) => item);
      result.current[1].move(0, 0);
      result.current[1].move(0, 7);
      result.current[1].filter(() => true);
      result.current[1].push();
    });
    expect(result.current[0]).toBe(before);
  });

  it('filters, clears and resets', () => {
    const { result } = setup([1, 2, 3, 4]);
    act(() => result.current[1].filter((n) => n % 2 === 0));
    expect(result.current[0]).toEqual([2, 4]);
    act(() => result.current[1].clear());
    expect(result.current[0]).toEqual([]);
    const empty = result.current[0];
    act(() => result.current[1].clear());
    expect(result.current[0]).toBe(empty);
    act(() => result.current[1].reset());
    expect(result.current[0]).toEqual([1, 2, 3, 4]);
  });

  it('composes several updates in one event', () => {
    const { result } = setup<number>([]);
    act(() => {
      result.current[1].push(1);
      result.current[1].push(2);
      result.current[1].set((previous) => [...previous, 3]);
    });
    expect(result.current[0]).toEqual([1, 2, 3]);
  });

  it('keeps the actions object stable', () => {
    const { result } = setup([1]);
    const actions = result.current[1];
    act(() => result.current[1].push(2));
    expect(result.current[1]).toBe(actions);
  });
});
