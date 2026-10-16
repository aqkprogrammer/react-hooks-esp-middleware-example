import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SetStateInRenderDemo from './SetStateInRenderDemo';

describe('SetStateInRenderDemo', () => {
  it('derives the formatted prices from the currency', async () => {
    const user = userEvent.setup();
    render(<SetStateInRenderDemo />);
    expect(screen.getByRole('button', { name: 'monthly: €12.00' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Currency'), 'USD');
    expect(screen.getByRole('button', { name: 'yearly: $120.00' })).toBeInTheDocument();
  });

  it('selects on click and resets the selection once when the currency changes', async () => {
    const user = userEvent.setup();
    render(<SetStateInRenderDemo />);
    await user.click(screen.getByRole('button', { name: /^yearly/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Selected the yearly plan in EUR.');
    await user.selectOptions(screen.getByLabelText('Currency'), 'GBP');
    expect(screen.getByRole('status')).toHaveTextContent('No plan selected.');
    await user.click(screen.getByRole('button', { name: /^monthly/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Selected the monthly plan in GBP.');
  });
});
