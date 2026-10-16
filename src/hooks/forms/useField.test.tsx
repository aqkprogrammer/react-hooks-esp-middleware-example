import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useField, type ValidateOn } from './useField';

const minLength3 = (value: string) => (value.length < 3 ? 'At least 3 characters' : undefined);

function Field({ validateOn }: { validateOn?: ValidateOn }) {
  const field = useField({ validate: minLength3, validateOn });
  return (
    <div>
      <label htmlFor={field.inputProps.id}>Name</label>
      <input {...field.inputProps} />
      {field.error ? <p id={field.errorId}>{field.error}</p> : null}
      <button type="button">Elsewhere</button>
      <button type="button" onClick={field.reset}>
        Reset
      </button>
      <span data-testid="state">{`${field.touched}/${field.dirty}`}</span>
    </div>
  );
}

describe('useField', () => {
  it('"touched" mode: no error while first typing, validates on blur, then on change', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Name');
    await user.type(input, 'a');
    expect(screen.queryByText('At least 3 characters')).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText('At least 3 characters')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('At least 3 characters');

    await user.type(input, 'bc');
    expect(screen.queryByText('At least 3 characters')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('"change" mode validates on the first keystroke', async () => {
    const user = userEvent.setup();
    render(<Field validateOn="change" />);
    await user.type(screen.getByLabelText('Name'), 'a');
    expect(screen.getByText('At least 3 characters')).toBeInTheDocument();
  });

  it('"blur" mode never validates while typing', async () => {
    const user = userEvent.setup();
    render(<Field validateOn="blur" />);
    const input = screen.getByLabelText('Name');
    await user.type(input, 'a');
    await user.tab();
    expect(screen.getByText('At least 3 characters')).toBeInTheDocument();
    await user.type(input, 'bcd');
    // Still showing the old result: only blur re-validates.
    expect(screen.getByText('At least 3 characters')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByText('At least 3 characters')).not.toBeInTheDocument();
  });

  it('tracks touched/dirty and resets everything', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Name');
    expect(screen.getByTestId('state')).toHaveTextContent('false/false');
    await user.type(input, 'a');
    await user.tab();
    expect(screen.getByTestId('state')).toHaveTextContent('true/true');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input).toHaveValue('');
    expect(screen.getByTestId('state')).toHaveTextContent('false/false');
    expect(screen.queryByText('At least 3 characters')).not.toBeInTheDocument();
  });

  it('runs async validation after sync rules pass and exposes isValidating', async () => {
    let finish: (message: string | undefined) => void = () => {};
    const { result } = renderHook(() =>
      useField({
        initialValue: 'ada',
        validate: minLength3,
        validateAsync: () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      }),
    );
    let pending: Promise<string | undefined> = Promise.resolve(undefined);
    act(() => {
      pending = result.current.validate();
    });
    expect(result.current.isValidating).toBe(true);
    expect(result.current.touched).toBe(true);
    await act(async () => {
      finish('Name is taken');
      await pending;
    });
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBe('Name is taken');
  });

  it('uses a custom id', () => {
    const { result } = renderHook(() => useField({ id: 'email' }));
    expect(result.current.inputProps.id).toBe('email');
    expect(result.current.errorId).toBe('email-error');
  });
});
