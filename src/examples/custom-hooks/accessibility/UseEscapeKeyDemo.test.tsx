import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseEscapeKeyDemo from './UseEscapeKeyDemo';

describe('UseEscapeKeyDemo', () => {
  it('closes the topmost layer first and returns focus to each opener', async () => {
    const user = userEvent.setup();
    render(<UseEscapeKeyDemo />);
    const filters = screen.getByRole('button', { name: 'Filters' });
    await user.click(filters);
    const sortButton = screen.getByRole('button', { name: 'Sort order' });
    await user.click(sortButton);
    expect(screen.getByRole('list', { name: 'Sort order' })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('list', { name: 'Sort order' })).not.toBeInTheDocument();
    expect(sortButton).toBeVisible();
    expect(sortButton).toHaveFocus();
    expect(screen.getByText(/sort menu closed \(Escape\)/)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(filters).toHaveAttribute('aria-expanded', 'false');
    expect(filters).toHaveFocus();
    expect(screen.getByText(/filter panel closed \(Escape\)/)).toBeInTheDocument();
  });

  it('picking a sort option closes the menu', async () => {
    const user = userEvent.setup();
    render(<UseEscapeKeyDemo />);
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('button', { name: 'Sort order' }));
    await user.click(screen.getByRole('button', { name: 'Most popular' }));
    expect(screen.getByText('Sort: Most popular')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort order' })).toHaveFocus();
  });
});
