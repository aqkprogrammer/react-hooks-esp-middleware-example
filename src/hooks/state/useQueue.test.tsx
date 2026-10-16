import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useQueue } from './useQueue';

describe('useQueue', () => {
  it('enqueues at the back and exposes first/last/size', () => {
    const { result } = renderHook(() => useQueue<string>(['a']));
    act(() => result.current.enqueue('b', 'c'));
    expect(result.current.items).toEqual(['a', 'b', 'c']);
    expect(result.current.size).toBe(3);
    expect(result.current.first).toBe('a');
    expect(result.current.last).toBe('c');
  });

  it('dequeues synchronously, even several times in one event', () => {
    const { result } = renderHook(() => useQueue([1, 2, 3]));
    let taken: Array<number | undefined> = [];
    act(() => {
      taken = [result.current.dequeue(), result.current.dequeue()];
    });
    expect(taken).toEqual([1, 2]);
    expect(result.current.items).toEqual([3]);
  });

  it('peeks at the live front item without removing it', () => {
    const { result } = renderHook(() => useQueue<number>());
    let peeked: number | undefined;
    act(() => {
      result.current.enqueue(7);
      peeked = result.current.peek(); // before React re-rendered
    });
    expect(peeked).toBe(7);
    expect(result.current.size).toBe(1);
  });

  it('returns undefined when empty and clears', () => {
    const { result } = renderHook(() => useQueue([1]));
    act(() => result.current.clear());
    expect(result.current.size).toBe(0);
    let value: number | undefined = 0;
    act(() => {
      value = result.current.dequeue();
    });
    expect(value).toBeUndefined();
    expect(result.current.first).toBeUndefined();
  });

  it('produces a new snapshot per change and keeps old snapshots intact', () => {
    const { result } = renderHook(() => useQueue(['x']));
    const before = result.current.items;
    act(() => result.current.enqueue('y'));
    expect(result.current.items).not.toBe(before);
    expect(before).toEqual(['x']);
  });

  it('keeps action identities stable', () => {
    const { result } = renderHook(() => useQueue<number>());
    const { enqueue, dequeue, peek, clear } = result.current;
    act(() => result.current.enqueue(1));
    expect(result.current.enqueue).toBe(enqueue);
    expect(result.current.dequeue).toBe(dequeue);
    expect(result.current.peek).toBe(peek);
    expect(result.current.clear).toBe(clear);
  });
});
