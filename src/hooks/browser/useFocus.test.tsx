import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useFocus } from './useFocus';

function Field({ attach = true, onChange }: { attach?: boolean; onChange?: () => void }) {
  const [ref, isFocused] = useFocus<HTMLInputElement>({ onChange });
  return (
    <>
      <label>
        Name
        <input ref={attach ? ref : undefined} />
      </label>
      <p>{isFocused ? 'focused' : 'not focused'}</p>
      <button type="button">Elsewhere</button>
    </>
  );
}

describe('useFocus', () => {
  it('reports focus and blur of the element', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field onChange={onChange} />);
    expect(screen.getByText('not focused')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Name'));
    expect(screen.getByText('focused')).toBeInTheDocument();
    await user.tab();
    expect(screen.getByText('not focused')).toBeInTheDocument();
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([true, false]);
  });

  it('detects an element that is already focused when the ref attaches', () => {
    const { rerender } = render(<Field attach={false} />);
    act(() => screen.getByLabelText('Name').focus());
    expect(screen.getByText('not focused')).toBeInTheDocument();
    rerender(<Field attach />);
    expect(screen.getByText('focused')).toBeInTheDocument();
  });

  it('stops listening after unmount', () => {
    const onChange = vi.fn();
    const { unmount } = render(<Field onChange={onChange} />);
    const input = screen.getByLabelText('Name');
    unmount();
    act(() => input.focus());
    expect(onChange).not.toHaveBeenCalled();
  });
});
