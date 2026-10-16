import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePrevious } from './usePrevious';

describe('usePrevious', () => {
  it('is undefined until the value changes', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    });
    expect(result.current).toBeUndefined();
    rerender({ value: 1 });
    expect(result.current).toBeUndefined();
  });

  it('returns the previous distinct value and ignores unrelated re-renders', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    // Re-rendering with the same value keeps the previous *distinct* value.
    rerender({ value: 'b' });
    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    rerender({ value: 'c' });
    expect(result.current).toBe('b');
  });

  it('supports a custom equality check', () => {
    const { result, rerender } = renderHook(
      ({ user }) => usePrevious(user, { isEqual: (a, b) => a.id === b.id }),
      { initialProps: { user: { id: 1, name: 'Ada' } } },
    );
    rerender({ user: { id: 1, name: 'Ada (new object)' } });
    expect(result.current).toBeUndefined();
    rerender({ user: { id: 2, name: 'Grace' } });
    expect(result.current).toEqual({ id: 1, name: 'Ada' });
  });

  it('treats NaN as equal to itself (Object.is)', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: Number.NaN },
    });
    rerender({ value: Number.NaN });
    expect(result.current).toBeUndefined();
  });
});
