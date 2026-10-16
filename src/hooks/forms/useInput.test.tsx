import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useInput } from './useInput';

function Harness({ transform }: { transform?: (raw: string) => string }) {
  const name = useInput('Ada', { transform });
  return (
    <div>
      <label htmlFor="name">Name</label>
      <input id="name" {...name.bind} />
      <button type="button" onClick={name.reset}>
        Reset
      </button>
      <output>{name.value}</output>
    </div>
  );
}

describe('useInput', () => {
  it('binds a controlled input and resets to the initial value', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Name');
    await user.clear(input);
    await user.type(input, 'Grace');
    expect(input).toHaveValue('Grace');
    expect(screen.getByRole('status')).toHaveTextContent('Grace');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input).toHaveValue('Ada');
  });

  it('applies the transform to user input only', async () => {
    const user = userEvent.setup();
    render(<Harness transform={(raw) => raw.replace(/\d/g, '')} />);
    const input = screen.getByLabelText('Name');
    await user.type(input, '1a2b');
    expect(input).toHaveValue('Adaab');
  });

  it('keeps callbacks stable and lets setValue bypass the transform', () => {
    const { result, rerender } = renderHook(() =>
      useInput('', { transform: (raw) => raw.toUpperCase() }),
    );
    const { onChange, reset, setValue } = result.current;
    act(() => result.current.setValue('lower'));
    rerender();
    expect(result.current.value).toBe('lower');
    expect(result.current.onChange).toBe(onChange);
    expect(result.current.reset).toBe(reset);
    expect(result.current.setValue).toBe(setValue);
  });
});
