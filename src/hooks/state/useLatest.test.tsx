import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLatest } from './useLatest';

describe('useLatest', () => {
  it('returns a stable ref whose value tracks the latest render', () => {
    const { result, rerender } = renderHook(({ value }) => useLatest(value), {
      initialProps: { value: 1 },
    });
    const firstRef = result.current;
    expect(firstRef.current).toBe(1);
    rerender({ value: 2 });
    expect(result.current).toBe(firstRef);
    expect(firstRef.current).toBe(2);
  });
});
