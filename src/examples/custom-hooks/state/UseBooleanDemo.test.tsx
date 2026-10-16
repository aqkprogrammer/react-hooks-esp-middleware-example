import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseBooleanDemo from './UseBooleanDemo';

describe('UseBooleanDemo', () => {
  it('opens, closes and toggles the disclosure', async () => {
    const user = userEvent.setup();
    render(<UseBooleanDemo />);
    const disclosure = screen.getByRole('button', { name: 'Show details' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    await user.click(disclosure);
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByText('closed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('open')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByText('closed')).toBeInTheDocument();
    // Stable actions: the memoized toolbar committed only once.
    expect(screen.getByText(/Memoized toolbar commits:/)).toHaveTextContent(/commits: 1 /);
  });
});
