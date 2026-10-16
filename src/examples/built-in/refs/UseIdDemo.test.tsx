import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseIdDemo from './UseIdDemo';

describe('UseIdDemo', () => {
  it('associates each label and hint with its own input', () => {
    render(<UseIdDemo />);
    const password = screen.getByLabelText('New password');
    const confirm = screen.getByLabelText('Confirm password');
    expect(password).not.toBe(confirm);
    expect(password.id).not.toBe(confirm.id);
    expect(password).toHaveAccessibleDescription('At least 8 characters.');
    expect(confirm).toHaveAccessibleDescription('At least 8 characters.');
  });

  it('adds the error to aria-describedby only for the invalid field', async () => {
    const user = userEvent.setup();
    render(<UseIdDemo />);
    await user.type(screen.getByLabelText('Confirm password'), 'abc');
    expect(screen.getByLabelText('Confirm password')).toHaveAccessibleDescription(
      'At least 8 characters. 5 more characters needed.',
    );
    expect(screen.getByLabelText('Confirm password')).toBeInvalid();
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      'At least 8 characters.',
    );
  });

  it('generates unique ids for new instances', async () => {
    const user = userEvent.setup();
    const { container } = render(<UseIdDemo />);
    await user.click(screen.getByRole('button', { name: 'Add another field' }));
    await user.click(screen.getByRole('button', { name: 'Add another field' }));
    expect(screen.getByLabelText('Extra password 2')).toBeInTheDocument();

    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    // React 19.2+ format: valid as a CSS selector.
    const inputId = screen.getByLabelText('Extra password 1').id;
    expect(() => container.querySelector(`#${inputId}`)).not.toThrow();
    expect(inputId).toMatch(/^_r_[0-9a-z]+_-input$/);
  });
});
