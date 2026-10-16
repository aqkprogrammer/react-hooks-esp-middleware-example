import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useFocusWithin, type UseFocusWithinOptions } from './useFocusWithin';

function Group(props: UseFocusWithinOptions) {
  const [ref, isFocusWithin] = useFocusWithin<HTMLFieldSetElement>(props);
  return (
    <>
      <button type="button">Before</button>
      <fieldset ref={ref}>
        <legend>{isFocusWithin ? 'inside' : 'outside'}</legend>
        <button type="button">One</button>
        <button type="button">Two</button>
      </fieldset>
      <button type="button">After</button>
    </>
  );
}

describe('useFocusWithin', () => {
  it('fires once when focus enters and once when it leaves, not when moving inside', async () => {
    const user = userEvent.setup();
    const onFocusWithin = vi.fn();
    const onBlurWithin = vi.fn();
    render(<Group onFocusWithin={onFocusWithin} onBlurWithin={onBlurWithin} />);

    await user.click(screen.getByRole('button', { name: 'Before' }));
    await user.tab(); // → One
    expect(screen.getByText('inside')).toBeInTheDocument();
    await user.tab(); // → Two (moves within)
    expect(screen.getByText('inside')).toBeInTheDocument();
    expect(onFocusWithin).toHaveBeenCalledTimes(1);
    expect(onBlurWithin).not.toHaveBeenCalled();

    await user.tab(); // → After
    expect(screen.getByText('outside')).toBeInTheDocument();
    expect(onBlurWithin).toHaveBeenCalledTimes(1);
    expect(onBlurWithin.mock.calls[0]?.[0].relatedTarget).toBe(
      screen.getByRole('button', { name: 'After' }),
    );
  });

  it('treats focus moving to nothing (relatedTarget null) as leaving', async () => {
    const user = userEvent.setup();
    const onBlurWithin = vi.fn();
    render(<Group onBlurWithin={onBlurWithin} />);
    await user.click(screen.getByRole('button', { name: 'One' }));
    screen.getByRole('button', { name: 'One' }).blur();
    expect(await screen.findByText('outside')).toBeInTheDocument();
    expect(onBlurWithin).toHaveBeenCalledTimes(1);
  });

  it('removes listeners on unmount', () => {
    const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
    const { unmount } = render(<Group />);
    unmount();
    const types = remove.mock.calls.map(([type]) => type);
    expect(types).toEqual(expect.arrayContaining(['focusin', 'focusout']));
  });
});
