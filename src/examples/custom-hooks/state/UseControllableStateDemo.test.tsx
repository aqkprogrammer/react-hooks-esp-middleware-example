import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseControllableStateDemo from './UseControllableStateDemo';

describe('UseControllableStateDemo', () => {
  it('updates the uncontrolled rating on its own', async () => {
    const user = userEvent.setup();
    render(<UseControllableStateDemo />);
    const group = screen.getByRole('group', { name: 'Uncontrolled rating' });
    await user.click(within(group).getByRole('button', { name: '4 stars' }));
    expect(screen.getByText('Uncontrolled rating: 4 / 5')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('uncontrolled → 4');
  });

  it('lets the parent accept or reject controlled changes', async () => {
    const user = userEvent.setup();
    render(<UseControllableStateDemo />);
    const group = screen.getByRole('group', { name: 'Controlled rating' });
    await user.click(within(group).getByRole('button', { name: '5 stars' }));
    expect(screen.getByText('Controlled rating: 5 / 5')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Parent only accepts odd ratings' }));
    await user.click(within(group).getByRole('button', { name: '2 stars' }));
    expect(screen.getByText('Controlled rating: 5 / 5')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('controlled: parent rejected 2');

    await user.click(within(group).getByRole('button', { name: '1 star' }));
    expect(screen.getByText('Controlled rating: 1 / 5')).toBeInTheDocument();
  });
});
