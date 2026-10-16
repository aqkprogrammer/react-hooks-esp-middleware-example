import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  it('manages its own state when uncontrolled and reports changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('composes several updaters in one event when uncontrolled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }));
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it('defers to the parent when controlled', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 5 } },
    );
    act(() => result.current[1]((n) => n + 1));
    expect(onChange).toHaveBeenCalledWith(6);
    // The parent has not accepted the change yet.
    expect(result.current[0]).toBe(5);
    rerender({ value: 6 });
    expect(result.current[0]).toBe(6);
  });

  it('does not call onChange for equal values', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 'a', onChange }));
    act(() => result.current[1]('a'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps setValue stable and always calls the latest onChange', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onChange }) => useControllableState({ defaultValue: 0, onChange }),
      { initialProps: { onChange: first } },
    );
    const setValue = result.current[1];
    rerender({ onChange: second });
    expect(result.current[1]).toBe(setValue);
    act(() => result.current[1](1));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });

  it('warns once when switching between controlled and uncontrolled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ value }: { value: number | undefined }) =>
        useControllableState({ value, defaultValue: 0, name: 'Stepper' }),
      { initialProps: { value: undefined as number | undefined } },
    );
    rerender({ value: 3 });
    rerender({ value: undefined });
    rerender({ value: 4 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(
      'Stepper is changing from uncontrolled to controlled',
    );
  });
});
