import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('toggles a boolean by default', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[2](false));
    expect(result.current[0]).toBe(false);
  });

  it('starts from a boolean initial value', () => {
    expect(renderHook(() => useToggle(true)).result.current[0]).toBe(true);
  });

  it('cycles through a tuple of values and wraps around', () => {
    const { result } = renderHook(() => useToggle(['light', 'dark', 'system']));
    expect(result.current[0]).toBe('light');
    act(() => result.current[1]());
    expect(result.current[0]).toBe('dark');
    act(() => {
      result.current[1]();
      result.current[1]();
    });
    expect(result.current[0]).toBe('light');
  });

  it('starts from initialValue and jumps with setValue', () => {
    const { result } = renderHook(() => useToggle(['s', 'm', 'l'], 'm'));
    expect(result.current[0]).toBe('m');
    act(() => result.current[2]('l'));
    expect(result.current[0]).toBe('l');
  });

  it('ignores (and warns about) values that are not in the list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useToggle([1, 2, 3]));
    act(() => (result.current[2] as (value: number) => void)(42));
    expect(result.current[0]).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps toggle and setValue stable even with inline arrays', () => {
    const { result, rerender } = renderHook(() => useToggle(['a', 'b']));
    const [, toggle, setValue] = result.current;
    rerender();
    expect(result.current[1]).toBe(toggle);
    expect(result.current[2]).toBe(setValue);
  });

  it('rejects lists with fewer than two values', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const values = ['only'] as unknown as readonly [string, string];
    expect(() => renderHook(() => useToggle(values))).toThrow(RangeError);
  });
});
