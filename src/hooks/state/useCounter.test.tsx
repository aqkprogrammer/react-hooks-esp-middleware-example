import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments and decrements by step, composing within one event', () => {
    const { result } = renderHook(() => useCounter(0, { step: 2 }));
    act(() => {
      result.current.increment();
      result.current.increment();
    });
    expect(result.current.count).toBe(4);
    act(() => result.current.decrement());
    expect(result.current.count).toBe(2);
  });

  it('clamps to min/max and reports the bounds', () => {
    const { result } = renderHook(() => useCounter(9, { min: 0, max: 10, step: 5 }));
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);
    expect(result.current.isAtMax).toBe(true);
    act(() => result.current.set(-50));
    expect(result.current.count).toBe(0);
    expect(result.current.isAtMin).toBe(true);
  });

  it('clamps the initial value and reset()', () => {
    const { result } = renderHook(() => useCounter(100, { max: 5 }));
    expect(result.current.count).toBe(5);
    act(() => result.current.set(1));
    act(() => result.current.reset());
    expect(result.current.count).toBe(5);
  });

  it('supports updater functions and ignores NaN', () => {
    const { result } = renderHook(() => useCounter(3));
    act(() => result.current.set((n) => n * 10));
    expect(result.current.count).toBe(30);
    act(() => result.current.set(Number.NaN));
    expect(result.current.count).toBe(30);
  });

  it('re-clamps the rendered count when bounds narrow', () => {
    const { result, rerender } = renderHook(({ max }) => useCounter(8, { max }), {
      initialProps: { max: 10 },
    });
    rerender({ max: 4 });
    expect(result.current.count).toBe(4);
    act(() => result.current.decrement());
    expect(result.current.count).toBe(3);
  });

  it('keeps actions stable while options are unchanged', () => {
    const { result, rerender } = renderHook(() => useCounter(0, { min: 0, max: 5 }));
    const { increment, decrement, set, reset } = result.current;
    act(() => result.current.increment());
    rerender();
    expect(result.current.increment).toBe(increment);
    expect(result.current.decrement).toBe(decrement);
    expect(result.current.set).toBe(set);
    expect(result.current.reset).toBe(reset);
  });

  it('throws when min > max', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCounter(0, { min: 5, max: 1 }))).toThrow(RangeError);
  });
});
