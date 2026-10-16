import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseFieldDemo from './UseFieldDemo';

describe('UseFieldDemo', () => {
  it('shows errors on blur in "touched" mode and clears them while fixing', async () => {
    const user = userEvent.setup();
    render(<UseFieldDemo />);
    const email = screen.getByLabelText('Email');
    await user.type(email, 'ada');
    expect(screen.queryByText(/Enter an email like/)).not.toBeInTheDocument();
    await user.tab();
    expect(email).toHaveAccessibleDescription('Enter an email like name@example.com');
    await user.type(email, '@example.com');
    expect(screen.queryByText(/Enter an email like/)).not.toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
  });

  it('switching to "change" mode validates on the first keystroke and starts fresh', async () => {
    const user = userEvent.setup();
    render(<UseFieldDemo />);
    await user.type(screen.getByLabelText('Email'), 'x');
    await user.click(screen.getByRole('radio', { name: /^change/ }));
    expect(screen.getByLabelText('Email')).toHaveValue('');
    await user.type(screen.getByLabelText('Email'), 'x');
    expect(screen.getByText('Enter an email like name@example.com')).toBeInTheDocument();
  });

  it('"Validate now" and "Reset" work', async () => {
    const user = userEvent.setup();
    render(<UseFieldDemo />);
    await user.click(screen.getByRole('button', { name: 'Validate now' }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });
});
