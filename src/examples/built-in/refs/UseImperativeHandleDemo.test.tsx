import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseImperativeHandleDemo from './UseImperativeHandleDemo';

describe('UseImperativeHandleDemo', () => {
  it('shakes and focuses the input through the handle on an invalid submit', async () => {
    const user = userEvent.setup();
    render(<UseImperativeHandleDemo />);
    const input = screen.getByLabelText('6-digit code');
    await user.type(input, '12');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(screen.getByRole('status')).toHaveTextContent('Enter the 6-digit code.');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('data-shakes', '1');
    expect(input).toHaveClass('use-imperative-handle-demo-shake-a');

    // A second shake switches animation name so the browser restarts it.
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(input).toHaveClass('use-imperative-handle-demo-shake-b');
  });

  it('accepts a valid code', async () => {
    const user = userEvent.setup();
    render(<UseImperativeHandleDemo />);
    await user.type(screen.getByLabelText('6-digit code'), '123456{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Code 123456 accepted.');
  });

  it('exposes only focus, clear and shake', async () => {
    const user = userEvent.setup();
    render(<UseImperativeHandleDemo />);
    const input = screen.getByLabelText('6-digit code');
    await user.type(input, '999');

    await user.click(screen.getByRole('button', { name: 'handle.clear()' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    expect(input).toHaveAttribute('data-shakes', '0');
    await user.click(screen.getByRole('button', { name: 'handle.shake()' }));
    expect(input).toHaveAttribute('data-shakes', '1');

    await user.click(screen.getByRole('button', { name: 'handle.focus()' }));
    expect(input).toHaveFocus();
  });
});
