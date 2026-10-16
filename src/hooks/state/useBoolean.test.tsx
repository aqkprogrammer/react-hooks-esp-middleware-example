import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBoolean } from './useBoolean';

describe('useBoolean', () => {
  it('defaults to false and accepts an initial value or initializer', () => {
    expect(renderHook(() => useBoolean()).result.current.value).toBe(false);
    expect(renderHook(() => useBoolean(true)).result.current.value).toBe(true);
    expect(renderHook(() => useBoolean(() => true)).result.current.value).toBe(true);
  });

  it('sets, clears and toggles', () => {
    const { result } = renderHook(() => useBoolean());
    act(() => result.current.setTrue());
    expect(result.current.value).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.value).toBe(false);
    act(() => {
      result.current.toggle();
      result.current.toggle();
      result.current.toggle();
    });
    expect(result.current.value).toBe(true);
    act(() => result.current.setFalse());
    expect(result.current.value).toBe(false);
    act(() => result.current.setValue((previous) => !previous));
    expect(result.current.value).toBe(true);
  });

  it('keeps action identities stable across renders', () => {
    const { result } = renderHook(() => useBoolean());
    const { setTrue, setFalse, toggle, setValue } = result.current;
    act(() => result.current.toggle());
    expect(result.current.setTrue).toBe(setTrue);
    expect(result.current.setFalse).toBe(setFalse);
    expect(result.current.toggle).toBe(toggle);
    expect(result.current.setValue).toBe(setValue);
  });

  it('ignores arguments such as click events', () => {
    const { result } = renderHook(() => useBoolean());
    const toggle = result.current.toggle as unknown as (event: unknown) => void;
    act(() => toggle({ type: 'click' }));
    expect(result.current.value).toBe(true);
  });
});
