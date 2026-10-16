import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isStructurallyEqual, useFormDirtyState } from './useFormDirtyState';

const initial = { name: 'Ada', tags: ['math'], newsletter: false };

describe('isStructurallyEqual', () => {
  it('compares primitives, arrays, plain objects and dates by value', () => {
    expect(isStructurallyEqual(['a', { b: 1 }], ['a', { b: 1 }])).toBe(true);
    expect(isStructurallyEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(isStructurallyEqual(new Date(1), new Date(1))).toBe(true);
    expect(isStructurallyEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(isStructurallyEqual('1', 1)).toBe(false);
  });
});

describe('useFormDirtyState', () => {
  it('derives dirty fields and returns to clean when a change is undone', () => {
    const { result, rerender } = renderHook(({ values }) => useFormDirtyState(values, initial), {
      initialProps: { values: initial },
    });
    expect(result.current.isDirty).toBe(false);

    rerender({ values: { ...initial, name: 'Grace', tags: ['math'] } });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.dirtyFields).toEqual(['name']);
    expect(result.current.isFieldDirty('tags')).toBe(false);

    rerender({ values: { ...initial, tags: ['math'] } });
    expect(result.current.isDirty).toBe(false);
  });

  it('supports a custom equality function', () => {
    const { result } = renderHook(() =>
      useFormDirtyState(
        { name: ' ada ' },
        { name: 'Ada' },
        {
          isEqual: (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase(),
        },
      ),
    );
    expect(result.current.isDirty).toBe(false);
  });

  it('registers a beforeunload guard only while dirty and warnOnUnload is on', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const count = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === 'beforeunload').length;

    const { rerender, unmount } = renderHook(
      ({ values, warn }) => useFormDirtyState(values, initial, { warnOnUnload: warn }),
      { initialProps: { values: initial, warn: true } },
    );
    expect(count(add)).toBe(0);

    rerender({ values: { ...initial, name: 'Grace' }, warn: true });
    expect(count(add)).toBe(1);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    rerender({ values: { ...initial, name: 'Grace' }, warn: false });
    expect(count(remove)).toBe(1);
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);

    rerender({ values: { ...initial, name: 'Grace' }, warn: true });
    unmount();
    expect(count(remove)).toBe(count(add));
  });
});
