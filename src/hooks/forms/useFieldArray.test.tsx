import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useFieldArray } from './useFieldArray';

describe('useFieldArray', () => {
  it('keeps keys stable across remove and move', () => {
    const { result } = renderHook(() => useFieldArray(['a', 'b', 'c']));
    const [a, b, c] = result.current.fields.map((field) => field.key);
    expect(new Set([a, b, c]).size).toBe(3);

    act(() => result.current.remove(0));
    expect(result.current.fields.map((field) => field.key)).toEqual([b, c]);

    act(() => result.current.move(1, 0));
    expect(result.current.fields).toEqual([
      { key: c, value: 'c' },
      { key: b, value: 'b' },
    ]);
    expect(result.current.values).toEqual(['c', 'b']);
  });

  it('append, prepend and insert create new keys; update keeps the key', () => {
    const { result } = renderHook(() => useFieldArray<string>([]));
    act(() => {
      result.current.append('second');
      result.current.prepend('first');
      result.current.insert(99, 'last'); // clamped
      result.current.insert(1, 'middle');
    });
    expect(result.current.values).toEqual(['first', 'middle', 'second', 'last']);
    const key = result.current.fields[2]?.key;
    act(() => result.current.update(2, (previous) => previous.toUpperCase()));
    expect(result.current.fields[2]).toEqual({ key, value: 'SECOND' });
  });

  it('ignores out-of-range indices', () => {
    const { result } = renderHook(() => useFieldArray(['x']));
    const before = result.current.fields;
    act(() => {
      result.current.remove(5);
      result.current.move(0, 3);
      result.current.update(-1, 'y');
    });
    expect(result.current.fields).toBe(before);
  });

  it('replace and reset assign fresh keys', () => {
    const { result } = renderHook(() => useFieldArray(() => ['a']));
    const original = result.current.fields[0]?.key;
    act(() => result.current.replace(['a', 'b']));
    expect(result.current.fields[0]?.key).not.toBe(original);
    act(() => result.current.reset());
    expect(result.current.values).toEqual(['a']);
    expect(result.current.fields[0]?.key).not.toBe(original);
  });

  it('keeps uncontrolled input state with the right row when rows move (unlike index keys)', async () => {
    const user = userEvent.setup();
    function Rows() {
      const rows = useFieldArray(['Home', 'Work']);
      return (
        <ul>
          {rows.fields.map((field, index) => (
            <li key={field.key}>
              <input aria-label={`Note for ${field.value}`} defaultValue="" />
              <button type="button" onClick={() => rows.remove(index)}>
                Remove {field.value}
              </button>
            </li>
          ))}
        </ul>
      );
    }
    render(<Rows />);
    await user.type(screen.getByLabelText('Note for Work'), 'office line');
    await user.click(screen.getByRole('button', { name: 'Remove Home' }));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(within(items[0] as HTMLElement).getByLabelText('Note for Work')).toHaveValue(
      'office line',
    );
  });
});
