import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UsePaginationDemo from './UsePaginationDemo';

describe('UsePaginationDemo', () => {
  it('pages through server results and resets on filter', async () => {
    const user = userEvent.setup();
    render(<UsePaginationDemo />);
    expect(await screen.findByText(/Showing 1–10 of 500/)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Pagination' });

    await user.click(within(nav).getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(/Showing 11–20 of 500/)).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.selectOptions(screen.getByLabelText('Page size'), '25');
    expect(await screen.findByText(/Showing 1–25 of 500/)).toBeInTheDocument();
  });

  it('shows "No results" for a filter without matches', async () => {
    const user = userEvent.setup();
    render(<UsePaginationDemo />);
    await screen.findByText(/of 500/);
    await user.type(screen.getByLabelText('Filter by name'), 'zzzz');
    expect(await screen.findByText('No results')).toBeInTheDocument();
  });
});
