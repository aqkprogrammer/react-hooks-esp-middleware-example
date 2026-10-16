import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DerivedStateDemo from './DerivedStateDemo';

describe('DerivedStateDemo', () => {
  it('derives list, total and summary in the same render as the query', async () => {
    const user = userEvent.setup();
    render(<DerivedStateDemo />);
    expect(screen.getByText('5 items, 341.74 total')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Filter items'), 'mon');
    expect(
      within(screen.getByRole('list', { name: 'Cart items' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(screen.getByText('2 items, 248.00 total')).toBeInTheDocument();
  });

  it('commits exactly once per keystroke', async () => {
    const user = userEvent.setup();
    render(<DerivedStateDemo />);
    await user.type(screen.getByLabelText('Filter items'), 'usb');
    expect(screen.getByText(/Cart commits:/)).toHaveTextContent(/commits: 4 /);
  });
});
