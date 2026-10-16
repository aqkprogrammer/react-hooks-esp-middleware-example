import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UsePreviousDemo from './UsePreviousDemo';

describe('UsePreviousDemo', () => {
  it('shows the previous price and keeps it across unrelated re-renders', async () => {
    const user = userEvent.setup();
    render(<UsePreviousDemo />);
    const table = screen.getByLabelText('Price');
    expect(table).toHaveTextContent('Previousundefined');

    await user.click(screen.getByRole('button', { name: 'Price +5' }));
    expect(table).toHaveTextContent('Current105');
    expect(table).toHaveTextContent('Previous100');
    expect(table).toHaveTextContent('up');

    await user.click(screen.getByRole('button', { name: 'Re-render without changing the price' }));
    expect(table).toHaveTextContent('Previous100');

    await user.click(screen.getByRole('button', { name: 'Price −5' }));
    expect(table).toHaveTextContent('Previous105');
    expect(table).toHaveTextContent('down');
  });
});
