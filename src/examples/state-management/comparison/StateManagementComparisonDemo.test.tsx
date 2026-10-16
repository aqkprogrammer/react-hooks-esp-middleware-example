import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { approaches } from './comparisonData';
import StateManagementComparisonDemo from './StateManagementComparisonDemo';

describe('StateManagementComparisonDemo', () => {
  it('lists every approach and filters by need', async () => {
    const user = userEvent.setup();
    render(<StateManagementComparisonDemo />);
    expect(screen.getAllByRole('row')).toHaveLength(approaches.length + 1);
    await user.selectOptions(
      screen.getByLabelText('What do you need?'),
      'Data that lives on a server (cache, refetch, optimistic updates)',
    );
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('rowheader', { name: 'TanStack Query / SWR' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(`1 of ${approaches.length}`);
  });

  it('maps every need to at least one approach', () => {
    const needs = new Set(approaches.flatMap((row) => row.fits));
    expect(needs.size).toBe(6);
  });
});
